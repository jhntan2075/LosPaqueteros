package pe.pucp.paqtracker.lectura;

import org.junit.jupiter.api.Test;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Rubrica c.1inf54.26-2, criterio general 21: el juego de datos proporcionado se usa completo. Los 36
 * meses de ventas y de bloqueos de datos/ se leen con el mismo lector del planificador sin una sola
 * linea rechazada.
 */
class RubricaJuegoDatosTest {

    private static final Path DATOS = Path.of("..", "datos");
    private static final int MESES = 36;

    @Test
    void ventas_los36Meses_seLeenCompletosSinLineasInvalidas() throws IOException {
        List<Path> archivos = archivos(DATOS.resolve("ventas.v20260909"), "ventas.");
        assertEquals(MESES, archivos.size());
        int total = 0;
        for (Path archivo : archivos) {
            ResultadoValidacion resultado = CargadorPedidos.validar(Files.readAllLines(archivo, StandardCharsets.UTF_8));
            assertTrue(resultado.esValido(), archivo + ": " + resultado.getErrores());
            assertTrue(resultado.getRegistrosValidos() > 0, archivo + " sin pedidos");
            total += resultado.getRegistrosValidos();
        }
        assertTrue(total > MESES * 100, "Se esperaban miles de pedidos y se leyeron " + total);
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

    private static List<Path> archivos(Path carpeta, String prefijo) throws IOException {
        try (Stream<Path> listado = Files.list(carpeta)) {
            return listado.filter(p -> p.getFileName().toString().startsWith(prefijo) && p.toString().endsWith(".txt"))
                    .sorted().toList();
        }
    }
}
