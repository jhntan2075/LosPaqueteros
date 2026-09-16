package pe.pucp.paqtracker.repositorio;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.util.Malla;
import pe.pucp.paqtracker.util.RangoFechas;
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/** Lee archivos de bloqueos individuales o carpetas versionadas. */
public final class CargadorBloqueos {

    private static final Pattern PATRON_TIEMPO = Pattern.compile("(\\d+)d(\\d+)h(\\d+)m");
    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MINUTOS_POR_HORA = 60;

    /**
     * Carga todos los bloqueos de un archivo o carpeta.
     *
     * @param ruta ruta del archivo o carpeta de bloqueos
     * @return lista de bloqueos cargados
     * @throws IOException si ocurre un error de lectura de los archivos
     */
    public static List<Bloqueo> cargar(String ruta) throws IOException {
        return cargar(ruta, null);
    }

    /**
     * Carga los bloqueos de un archivo o carpeta, filtrando opcionalmente por
     * un mes especifico.
     *
     * @param ruta ruta del archivo o carpeta de bloqueos
     * @param mes  mes en formato YYMM/YYYYMM a filtrar, o null para cargar todos los archivos
     * @return lista de bloqueos cargados
     * @throws IOException si ocurre un error de lectura de los archivos
     */
    public static List<Bloqueo> cargar(String ruta, String mes) throws IOException {
        List<Bloqueo> bloqueos = new ArrayList<>();
        for (Path archivo : archivosDeBloqueos(ruta, mes, null)) {
            leerArchivo(archivo, 0, null, bloqueos);
        }
        return bloqueos;
    }

    /**
     * Carga varios meses de una carpeta de bloqueos y desplaza sus ventanas
     * de vigencia a una linea temporal continua acotada por el rango de
     * fechas indicado.
     *
     * @param ruta  carpeta con los archivos bloqueo.YYMM.txt o bloqueo.YYYYMM.txt
     * @param rango rango de fechas de la simulacion
     * @return lista de bloqueos cargados cuya ventana de vigencia se solapa con el rango
     * @throws IOException si ocurre un error de lectura de los archivos
     */
    public static List<Bloqueo> cargarEnRango(String ruta, RangoFechas rango) throws IOException {
        List<Bloqueo> bloqueos = new ArrayList<>();
        for (Path archivo : archivosDeBloqueos(ruta, null, rango)) {
            YearMonth mes = mesDeArchivo(archivo);
            leerArchivo(archivo, rango.minutosDesdeInicio(mes), rango, bloqueos);
        }
        return bloqueos;
    }

    /**
     * Lee un archivo de bloqueos y agrega a la lista los que caen dentro del
     * rango indicado (si se provee uno), tras aplicarles el desplazamiento.
     *
     * @param archivo        archivo a leer
     * @param desplazamiento minutos a sumar a cada ventana de vigencia leida
     * @param rango          rango de fechas para filtrar, o null para no filtrar
     * @param bloqueos       lista donde se acumulan los bloqueos leidos
     * @throws IOException si ocurre un error de lectura del archivo
     */
    private static void leerArchivo(Path archivo, int desplazamiento, RangoFechas rango,
                                    List<Bloqueo> bloqueos) throws IOException {
        try (BufferedReader lector = Files.newBufferedReader(archivo)) {
            String linea;
            while ((linea = lector.readLine()) != null) {
                linea = linea.trim();
                if (linea.isEmpty()) {
                    continue;
                }
                Bloqueo bloqueo = parsearLinea(linea, desplazamiento);
                if (rango == null || seSolapaConRango(bloqueo, rango)) {
                    bloqueos.add(bloqueo);
                }
            }
        }
    }

    /**
     * Indica si la ventana de vigencia de un bloqueo se solapa con el rango.
     *
     * @param bloqueo bloqueo a evaluar
     * @param rango   rango de fechas de la simulacion
     * @return true si el bloqueo esta vigente en algun instante dentro del rango
     */
    private static boolean seSolapaConRango(Bloqueo bloqueo, RangoFechas rango) {
        return bloqueo.getInstanteFin() >= 0 && bloqueo.getInstanteInicio() < rango.duracionMinutos();
    }

    private static List<Path> archivosDeBloqueos(String ruta, String mes, RangoFechas rango)
            throws IOException {
        Path entrada = Path.of(ruta);
        if (Files.isRegularFile(entrada)) {
            return List.of(entrada);
        }
        if (!Files.isDirectory(entrada)) {
            throw new IOException("Ruta de bloqueos inexistente: " + ruta);
        }
        try (Stream<Path> archivos = Files.walk(entrada)) {
            return archivos.filter(Files::isRegularFile)
                    .filter(archivo -> archivo.getFileName().toString()
                            .matches("bloqueo\\.(?:\\d{4}|\\d{6})\\.txt"))
                    .filter(archivo -> mes == null || mesDeArchivo(archivo).toString()
                            .replace("-", "").equals(mes))
                    .filter(archivo -> rango == null || rango.contieneMes(mesDeArchivo(archivo)))
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        }
    }

    private static YearMonth mesDeArchivo(Path archivo) {
        String nombre = archivo.getFileName().toString();
        String valor = nombre.substring(8, nombre.length() - 4);
        if (valor.length() == 4) {
            return YearMonth.of(2000 + Integer.parseInt(valor.substring(0, 2)),
                Integer.parseInt(valor.substring(2, 4)));
        }
        return YearMonth.of(Integer.parseInt(valor.substring(0, 4)),
            Integer.parseInt(valor.substring(4, 6)));
    }

    private static Bloqueo parsearLinea(String linea, int desplazamiento) {
        String[] partes = linea.split(":");
        String[] rango = partes[0].split("-");
        int inicio = aMinutosAbsolutos(rango[0]) + desplazamiento;
        int fin = aMinutosAbsolutos(rango[1]) + desplazamiento;
        String[] coordenadas = partes[1].split(",");
        int[] numeros = new int[coordenadas.length];
        for (int i = 0; i < coordenadas.length; i++) {
            numeros[i] = Integer.parseInt(coordenadas[i].trim());
        }
        Set<Long> nodos = new HashSet<>();
        for (int i = 0; i + 3 < numeros.length; i += 2) {
            nodos.addAll(Malla.nodosDeTramo(numeros[i], numeros[i + 1],
                    numeros[i + 2], numeros[i + 3]));
        }
        return new Bloqueo(inicio, fin, nodos);
    }

    private static int aMinutosAbsolutos(String texto) {
        Matcher matcher = PATRON_TIEMPO.matcher(texto);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Marca de tiempo invalida: " + texto);
        }
        int dia = Integer.parseInt(matcher.group(1));
        int hora = Integer.parseInt(matcher.group(2));
        int minuto = Integer.parseInt(matcher.group(3));
        return (dia - 1) * MINUTOS_POR_DIA + hora * MINUTOS_POR_HORA + minuto;
    }

    private CargadorBloqueos() {
    }
}
