package pe.pucp.paqtracker.comun.archivos;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Stream;

/**
 * Guarda los archivos en el sistema de archivos local, en las carpetas de ventas y bloqueos
 * configuradas. Escribe primero a un temporal y lo mueve, para que una ejecucion que lee la carpeta no
 * vea un archivo a medias.
 */
@Component
public class AlmacenArchivosLocal implements PuertoAlmacenArchivos {

    private static final Logger LOGGER = LoggerFactory.getLogger(AlmacenArchivosLocal.class);
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");
    private static final DateTimeFormatter FORMATO_MES_CORTO = DateTimeFormatter.ofPattern("yyMM");

    private final Path carpetaVentas;
    private final Path carpetaBloqueos;

    /**
     * @param propiedades parametros de la operacion, con las carpetas de entrada
     */
    public AlmacenArchivosLocal(PropiedadesDominio propiedades) {
        this.carpetaVentas = Path.of(propiedades.datos().ventas());
        this.carpetaBloqueos = Path.of(propiedades.datos().bloqueos());
    }

    @Override
    public void guardarVentas(YearMonth mes, byte[] contenido) {
        escribir(carpetaVentas.resolve("ventas." + mes.format(FORMATO_MES) + ".txt"), contenido);
    }

    /**
     * El lector de bloqueos busca en subcarpetas y acepta los nombres bloqueo.YYMM.txt y
     * bloqueo.YYYYMM.txt: si ya hay un archivo del mes se reemplaza en su lugar y se borran los
     * duplicados, para que el mes no quede con bloqueos repetidos.
     */
    @Override
    public void guardarBloqueos(YearMonth mes, byte[] contenido) {
        List<String> nombres = List.of("bloqueo." + mes.format(FORMATO_MES_CORTO) + ".txt",
                "bloqueo." + mes.format(FORMATO_MES) + ".txt");
        List<Path> existentes = buscar(carpetaBloqueos, nombres);
        Path destino = existentes.isEmpty() ? carpetaBloqueos.resolve(nombres.get(0)) : existentes.get(0);
        escribir(destino, contenido);
        for (Path duplicado : existentes.subList(Math.min(1, existentes.size()), existentes.size())) {
            borrar(duplicado);
        }
    }

    private static List<Path> buscar(Path carpeta, List<String> nombres) {
        if (!Files.isDirectory(carpeta)) {
            return List.of();
        }
        try (Stream<Path> archivos = Files.walk(carpeta)) {
            return archivos.filter(Files::isRegularFile)
                    .filter(archivo -> nombres.contains(archivo.getFileName().toString())).sorted().toList();
        } catch (IOException excepcion) {
            throw new UncheckedIOException("No se pudo recorrer la carpeta " + carpeta, excepcion);
        }
    }

    private static void escribir(Path destino, byte[] contenido) {
        Path temporal = null;
        try {
            Files.createDirectories(destino.getParent());
            temporal = Files.createTempFile(destino.getParent(), "archivo", ".tmp");
            Files.write(temporal, contenido);
            Files.move(temporal, destino, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            LOGGER.info("Archivo de entrada guardado: {}", destino);
        } catch (IOException excepcion) {
            // Si el movimiento falla (en Windows, por ejemplo, con el destino abierto) el temporal quedaria
            // huerfano en la carpeta de datos.
            borrarTemporal(temporal, excepcion);
            throw new UncheckedIOException("No se pudo guardar el archivo " + destino, excepcion);
        }
    }

    private static void borrarTemporal(Path temporal, IOException causa) {
        if (temporal == null) {
            return;
        }
        try {
            Files.deleteIfExists(temporal);
        } catch (IOException excepcion) {
            causa.addSuppressed(excepcion);
            LOGGER.warn("No se pudo borrar el temporal {}", temporal, excepcion);
        }
    }

    private static void borrar(Path archivo) {
        try {
            Files.delete(archivo);
            LOGGER.info("Archivo duplicado reemplazado: {}", archivo);
        } catch (IOException excepcion) {
            throw new UncheckedIOException("No se pudo borrar el archivo duplicado " + archivo, excepcion);
        }
    }
}
