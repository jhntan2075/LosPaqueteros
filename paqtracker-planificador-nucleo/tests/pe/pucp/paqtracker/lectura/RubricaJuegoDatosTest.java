package pe.pucp.paqtracker.lectura;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Rubrica c.1inf54.26-2, criterio general 21: el juego de datos proporcionado se usa completo. Los 60
 * meses de ventas y los 36 de bloqueos de datos/ se leen con el mismo lector del planificador sin una
 * sola linea rechazada.
 */
class RubricaJuegoDatosTest {

    private static final Path DATOS = Path.of("..", "datos");
    private static final int MESES_VENTAS = 60;
    private static final int MESES = 36;

    @Test
    void ventas_los60Meses_seLeenCompletosSinLineasInvalidas() throws IOException {
        List<Path> archivos = archivos(DATOS.resolve("ventas.v20261126"), "ventas.");
        assertEquals(MESES_VENTAS, archivos.size());
        int total = 0;
        for (Path archivo : archivos) {
            ResultadoValidacion resultado = CargadorPedidos.validar(Files.readAllLines(archivo, StandardCharsets.UTF_8));
            assertTrue(resultado.esValido(), archivo + ": " + resultado.getErrores());
            assertTrue(resultado.getRegistrosValidos() > 0, archivo + " sin pedidos");
            total += resultado.getRegistrosValidos();
        }
        assertTrue(total > MESES_VENTAS * 100, "Se esperaban miles de pedidos y se leyeron " + total);
    }

    @Test
    void bloqueos_los36Meses_seLeenCompletosSinLineasInvalidas() throws IOException {
        List<Path> archivos = archivos(DATOS.resolve("bloqueos.v20260909").resolve("bloqueos"), "bloqueo.");
        assertEquals(MESES, archivos.size());
        for (Path archivo : archivos) {
            ResultadoValidacion resultado = CargadorBloqueos.validar(Files.readAllLines(archivo, StandardCharsets.UTF_8));
            assertTrue(resultado.esValido(), archivo + ": " + resultado.getErrores());
        }
    }

    /**
     * El plan de mantenimiento vigente se lee sin lineas rechazadas, cubre setiembre y octubre de 2026 y nombra
     * exactamente a las unidades de la flota por defecto (TA01-TA28, TM01-TM52, TB01-TB64), una vez cada una.
     */
    @Test
    void mantenimiento_seLeeCompletoYCubreExactamenteLaFlotaPorDefecto() throws IOException {
        List<String> lineas = Files.readAllLines(DATOS.resolve("mant.preventivo.09.10.txt"), StandardCharsets.UTF_8);
        ResultadoValidacion resultado = CargadorMantenimiento.validar(lineas);
        assertTrue(resultado.esValido(), resultado.getErrores().toString());

        List<CargadorMantenimiento.LineaMantenimiento> plan = CargadorMantenimiento.leer(lineas);
        Map<TipoVehiculo, Set<Integer>> porTipo = new EnumMap<>(TipoVehiculo.class);
        plan.forEach(l -> porTipo.computeIfAbsent(l.tipo(), t -> new TreeSet<>()).add(l.correlativo()));
        assertEquals(plan.size(), porTipo.values().stream().mapToInt(Set::size).sum(), "Una unidad se repite");
        assertEquals(correlativos(ConfiguracionDominio.CANTIDAD_AUTOS), porTipo.get(TipoVehiculo.AUTO));
        assertEquals(correlativos(ConfiguracionDominio.CANTIDAD_MOTOS), porTipo.get(TipoVehiculo.MOTOCICLETA));
        assertEquals(correlativos(ConfiguracionDominio.CANTIDAD_BICICLETAS), porTipo.get(TipoVehiculo.BICICLETA));
        assertTrue(plan.stream().allMatch(l -> !l.fecha().isBefore(LocalDate.of(2026, 9, 1))
                && !l.fecha().isAfter(LocalDate.of(2026, 10, 31))));
    }

    private static Set<Integer> correlativos(int cantidad) {
        return IntStream.rangeClosed(1, cantidad).boxed().collect(Collectors.toCollection(TreeSet::new));
    }

    private static List<Path> archivos(Path carpeta, String prefijo) throws IOException {
        try (Stream<Path> listado = Files.list(carpeta)) {
            return listado.filter(p -> p.getFileName().toString().startsWith(prefijo) && p.toString().endsWith(".txt"))
                    .sorted().toList();
        }
    }
}
