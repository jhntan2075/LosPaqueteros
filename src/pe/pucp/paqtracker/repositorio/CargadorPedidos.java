package pe.pucp.paqtracker.repositorio;

import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.util.RangoFechas;
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/** Lee archivos de pedidos individuales o carpetas de ventas versionadas. */
public final class CargadorPedidos {

    private static final int CAMPOS_ESPERADOS = 5;
    private static final Pattern PATRON_TIEMPO = Pattern.compile("(\\d+)d(\\d+)h(\\d+)m");
    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MINUTOS_POR_HORA = 60;

    /**
     * Carga los pedidos registrados antes del horizonte indicado, desde un
     * archivo unico o una carpeta con todos los archivos de ventas.
     *
     * @param ruta      ruta del archivo o carpeta de pedidos
     * @param horizonte minuto absoluto limite; se ignoran los pedidos posteriores
     * @return lista de pedidos cargados
     * @throws IOException si ocurre un error de lectura de los archivos
     */
    public static List<Pedido> cargar(String ruta, int horizonte) throws IOException {
        return cargar(ruta, horizonte, null);
    }

    /**
     * Carga los pedidos registrados antes del horizonte indicado, filtrando
     * opcionalmente por un mes especifico dentro de una carpeta de ventas.
     *
     * @param ruta      ruta del archivo o carpeta de pedidos
     * @param horizonte minuto absoluto limite; se ignoran los pedidos posteriores
     * @param mes       mes en formato YYYYMM a filtrar, o null para cargar todos los archivos
     * @return lista de pedidos cargados
     * @throws IOException si ocurre un error de lectura de los archivos
     */
    public static List<Pedido> cargar(String ruta, int horizonte, String mes) throws IOException {
        List<Pedido> pedidos = new ArrayList<>();
        int id = 0;
        for (Path archivo : archivosDeVentas(ruta, mes)) {
            try (BufferedReader lector = Files.newBufferedReader(archivo)) {
                String linea;
                while ((linea = lector.readLine()) != null) {
                    linea = linea.trim();
                    if (linea.isEmpty() || linea.startsWith("#")) {
                        continue;
                    }
                    Pedido pedido = parsearLinea(linea, id, horizonte, 0);
                    if (pedido != null) {
                        pedidos.add(pedido);
                        id++;
                    }
                }
            }
        }
        return pedidos;
    }

    /**
     * Carga varios meses de una carpeta de ventas y los concatena en una
     * linea temporal continua acotada por el rango de fechas indicado.
     *
     * @param ruta  carpeta con los archivos ventas.YYYYMM.txt
     * @param rango rango de fechas de la simulacion
     * @return lista de pedidos cargados dentro del rango, con instantes de registro continuos
     * @throws IOException si ocurre un error de lectura de los archivos
     */
    public static List<Pedido> cargarEnRango(String ruta, RangoFechas rango) throws IOException {
        List<Pedido> pedidos = new ArrayList<>();
        int id = 0;
        for (Path archivo : archivosDeVentas(ruta, rango)) {
            YearMonth mes = mesDeArchivo(archivo, "ventas.");
            int desplazamiento = rango.minutosDesdeInicio(mes);
            try (BufferedReader lector = Files.newBufferedReader(archivo)) {
                String linea;
                while ((linea = lector.readLine()) != null) {
                    linea = linea.trim();
                    if (linea.isEmpty() || linea.startsWith("#")) {
                        continue;
                    }
                    Pedido pedido = parsearLinea(linea, id, Integer.MAX_VALUE, desplazamiento);
                    if (pedido != null && rango.contiene(pedido.getInstanteRegistro())) {
                        pedidos.add(pedido);
                        id++;
                    }
                }
            }
        }
        return pedidos;
    }

    private static List<Path> archivosDeVentas(String ruta, String mes) throws IOException {
        Path entrada = Path.of(ruta);
        if (Files.isRegularFile(entrada)) {
            return List.of(entrada);
        }
        if (!Files.isDirectory(entrada)) {
            throw new IOException("Ruta de ventas inexistente: " + ruta);
        }
        try (Stream<Path> archivos = Files.list(entrada)) {
            return archivos.filter(Files::isRegularFile)
                    .filter(archivo -> archivo.getFileName().toString().matches("ventas\\.\\d{6}\\.txt"))
                    .filter(archivo -> mes == null || archivo.getFileName().toString()
                            .equals("ventas." + mes + ".txt"))
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        }
    }

    private static List<Path> archivosDeVentas(String ruta, RangoFechas rango) throws IOException {
        Path entrada = Path.of(ruta);
        if (!Files.isDirectory(entrada)) {
            throw new IOException("Para un rango se requiere una carpeta de ventas: " + ruta);
        }
        try (Stream<Path> archivos = Files.list(entrada)) {
            return archivos.filter(Files::isRegularFile)
                    .filter(archivo -> archivo.getFileName().toString().matches("ventas\\.\\d{6}\\.txt"))
                    .filter(archivo -> rango.contieneMes(mesDeArchivo(archivo, "ventas.")))
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        }
    }

    private static YearMonth mesDeArchivo(Path archivo, String prefijo) {
        String nombre = archivo.getFileName().toString();
        return YearMonth.of(Integer.parseInt(nombre.substring(prefijo.length(), prefijo.length() + 4)),
                Integer.parseInt(nombre.substring(prefijo.length() + 4, prefijo.length() + 6)));
    }

    private static Pedido parsearLinea(String linea, int id, int horizonte, int desplazamiento) {
        String[] campos = linea.split(",");
        if (campos.length < CAMPOS_ESPERADOS) {
            throw new IllegalArgumentException("Linea de pedido invalida: " + linea);
        }
        boolean formatoTemporal = campos[0].contains(":");
        String[] primerCampo = formatoTemporal ? campos[0].split(":") : new String[] {campos[0]};
        int registro = parsearTiempo(primerCampo[0].trim()) + desplazamiento;
        if (registro >= horizonte) {
            return null;
        }
        int x = Integer.parseInt((formatoTemporal ? primerCampo[1] : campos[1]).trim());
        int y = Integer.parseInt((formatoTemporal ? campos[1] : campos[2]).trim());
        int cantidad = Integer.parseInt(campos[3].trim());
        int plazoHoras = Integer.parseInt(campos[4].trim());
        int plazo = formatoTemporal ? plazoHoras * MINUTOS_POR_HORA : plazoHoras;
        return new Pedido(id, new Nodo(x, y), cantidad, registro, plazo);
    }

    /**
     * Convierte una marca de tiempo ddDhhHmmM (dia 1-indexado del mes, hora,
     * minuto) al minuto absoluto correspondiente dentro de ese mes. Tambien
     * acepta el formato legado de minuto absoluto como entero simple.
     *
     * @param texto marca de tiempo a convertir
     * @return minuto absoluto de mes, o el valor entero si viene en formato legado
     * @throws IllegalArgumentException si la marca de tiempo no respeta el formato esperado
     */
    private static int parsearTiempo(String texto) {
        if (!texto.contains("d") || !texto.contains("h") || !texto.contains("m")) {
            return Integer.parseInt(texto);
        }
        Matcher matcher = PATRON_TIEMPO.matcher(texto);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Marca de tiempo invalida: " + texto);
        }
        int dia = Integer.parseInt(matcher.group(1));
        int hora = Integer.parseInt(matcher.group(2));
        int minuto = Integer.parseInt(matcher.group(3));
        return (dia - 1) * MINUTOS_POR_DIA + hora * MINUTOS_POR_HORA + minuto;
    }

    private CargadorPedidos() {
    }
}
