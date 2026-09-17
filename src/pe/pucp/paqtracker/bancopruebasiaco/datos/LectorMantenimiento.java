package pe.pucp.paqtracker.bancopruebasiaco.datos;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Lee el plan de mantenimiento preventivo ({@code aaaammdd:UNIDAD}).
 *
 * <p>El archivo entregado cubre setiembre y octubre de 2026; el prototipo proyecta
 * ese plan sobre cualquier mes usando el día del mes, que es lo que se hizo para
 * calibrar los resultados de enero a junio.</p>
 */
public final class LectorMantenimiento {

    /**
     * @param codigosFlota   todas las unidades que aparecen en el archivo: es el censo de la flota
     * @param porDia         unidades en taller, indexadas por día del mes
     * @param mesesCubiertos meses {@code aaaamm} que el archivo realmente programa
     * @param intervenciones total de líneas del archivo
     */
    public record PlanMantenimiento(List<String> codigosFlota,
                                    Map<Integer, Set<String>> porDia,
                                    Set<String> mesesCubiertos,
                                    int intervenciones) {}

    private LectorMantenimiento() {
    }

    public static PlanMantenimiento leer(Path archivo, int diasMes) {
        return leer(archivo, diasMes, null, true);
    }

    /**
     * @param mesObjetivo mes {@code aaaamm} que se va a simular; solo se usa cuando
     *                    {@code proyectar} es {@code false}
     * @param proyectar   {@code true} aplica el plan a cualquier mes usando el día del
     *                    mes (supuesto heredado del banco de pruebas); {@code false}
     *                    solo programa taller en los meses que el archivo cubre de verdad
     */
    public static PlanMantenimiento leer(Path archivo, int diasMes, String mesObjetivo,
                                         boolean proyectar) {
        Set<String> codigos = new TreeSet<>();
        Map<Integer, Set<String>> porDia = new HashMap<>();
        Set<String> meses = new TreeSet<>();
        int intervenciones = 0;
        try {
            for (String linea : Files.readAllLines(archivo, StandardCharsets.UTF_8)) {
                String l = linea.trim();
                if (l.isEmpty()) {
                    continue;
                }
                int sep = l.indexOf(':');
                if (sep < 0) {
                    throw new IllegalArgumentException("Línea de mantenimiento no reconocida: " + l);
                }
                String fecha = l.substring(0, sep).trim();
                String unidad = l.substring(sep + 1).trim();
                codigos.add(unidad);
                intervenciones++;
                meses.add(fecha.substring(0, 6));
                int dia = Integer.parseInt(fecha.substring(6, 8));
                boolean aplica = proyectar || fecha.startsWith(mesObjetivo == null ? "" : mesObjetivo);
                if (aplica && dia <= diasMes) {
                    porDia.computeIfAbsent(dia, k -> new LinkedHashSet<>()).add(unidad);
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer " + archivo, e);
        }
        return new PlanMantenimiento(new ArrayList<>(codigos), porDia, meses, intervenciones);
    }
}
