package pe.pucp.paqtracker.repositorio;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.util.Malla;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee el archivo de bloqueos programados del proyecto. Cada linea tiene el
 * formato ##d##h##m-##d##h##m:x1,y1,x2,y2,..., donde el rango define la ventana
 * de vigencia y los puntos consecutivos forman tramos horizontales o verticales
 * de nodos bloqueados.
 */
public final class CargadorBloqueos {

    private static final Pattern PATRON_TIEMPO = Pattern.compile("(\\d+)d(\\d+)h(\\d+)m");
    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MINUTOS_POR_HORA = 60;

    /**
     * Carga la lista de bloqueos programados.
     *
     * @param ruta ruta del archivo de bloqueos
     * @return lista de bloqueos cargados
     * @throws IOException si ocurre un error de lectura del archivo
     */
    public static List<Bloqueo> cargar(String ruta) throws IOException {
        List<Bloqueo> bloqueos = new ArrayList<>();
        try (BufferedReader lector = new BufferedReader(new FileReader(ruta))) {
            String linea;
            while ((linea = lector.readLine()) != null) {
                linea = linea.trim();
                if (linea.isEmpty()) {
                    continue;
                }
                bloqueos.add(parsearLinea(linea));
            }
        }
        return bloqueos;
    }

    /**
     * Parsea una linea del archivo en un bloqueo.
     *
     * @param linea linea a parsear
     * @return bloqueo parseado
     */
    private static Bloqueo parsearLinea(String linea) {
        String[] partes = linea.split(":");
        String[] rango = partes[0].split("-");
        int inicio = aMinutosAbsolutos(rango[0]);
        int fin = aMinutosAbsolutos(rango[1]);
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

    /**
     * Convierte una marca ##d##h##m a minutos absolutos del mes.
     *
     * @param texto marca de tiempo del archivo
     * @return minutos absolutos desde el inicio del mes
     */
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
