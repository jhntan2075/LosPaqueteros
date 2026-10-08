package pe.pucp.paqtracker.comun.archivos;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pruebas del almacenamiento local de archivos de entrada: escritura y limpieza del temporal.
 */
class AlmacenArchivosLocalTest {

    private static final YearMonth MES = YearMonth.of(2026, 10);
    private static final byte[] CONTENIDO = "contenido".getBytes(StandardCharsets.UTF_8);

    @TempDir
    private Path carpeta;

    @Test
    void guardarVentas_carpetaVacia_escribeElArchivoSinDejarTemporales() throws IOException {
        AlmacenArchivosLocal almacen = crearAlmacen();

        almacen.guardarVentas(MES, CONTENIDO);

        assertEquals(List.of("ventas.202610.txt"), nombres(carpeta.resolve("ventas")));
    }

    @Test
    void guardarVentas_moverFalla_borraElTemporal() throws IOException {
        // Un directorio no vacio con el nombre del destino hace fallar el movimiento en cualquier sistema.
        Path destino = Files.createDirectories(carpeta.resolve("ventas").resolve("ventas.202610.txt"));
        Files.createFile(destino.resolve("ocupado.txt"));
        AlmacenArchivosLocal almacen = crearAlmacen();

        assertThrows(UncheckedIOException.class, () -> almacen.guardarVentas(MES, CONTENIDO));

        assertEquals(List.of("ventas.202610.txt"), nombres(carpeta.resolve("ventas")));
    }

    private AlmacenArchivosLocal crearAlmacen() {
        PropiedadesDominio.Datos datos = new PropiedadesDominio.Datos(carpeta.resolve("ventas").toString(),
                carpeta.resolve("bloqueos").toString());
        return new AlmacenArchivosLocal(new PropiedadesDominio(datos, null, null, null));
    }

    private static List<String> nombres(Path carpeta) throws IOException {
        try (Stream<Path> archivos = Files.list(carpeta)) {
            return archivos.map(archivo -> archivo.getFileName().toString()).sorted().toList();
        }
    }
}
