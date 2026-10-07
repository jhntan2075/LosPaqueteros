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

/**
 * Guarda los archivos en el sistema de archivos local, en la carpeta de ventas configurada. Escribe
 * primero a un temporal y lo mueve, para que una ejecucion que lee la carpeta no vea un archivo a medias.
 */
@Component
public class AlmacenArchivosLocal implements PuertoAlmacenArchivos {

    private static final Logger LOGGER = LoggerFactory.getLogger(AlmacenArchivosLocal.class);
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");

    private final Path carpetaVentas;

    /**
     * @param propiedades parametros de la operacion, con la carpeta de ventas
     */
    public AlmacenArchivosLocal(PropiedadesDominio propiedades) {
        this.carpetaVentas = Path.of(propiedades.datos().ventas());
    }

    @Override
    public void guardarVentas(YearMonth mes, byte[] contenido) {
        Path destino = carpetaVentas.resolve("ventas." + mes.format(FORMATO_MES) + ".txt");
        try {
            Files.createDirectories(carpetaVentas);
            Path temporal = Files.createTempFile(carpetaVentas, "ventas", ".tmp");
            Files.write(temporal, contenido);
            Files.move(temporal, destino, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            LOGGER.info("Archivo de ventas guardado: {}", destino);
        } catch (IOException excepcion) {
            throw new UncheckedIOException("No se pudo guardar el archivo de ventas " + destino, excepcion);
        }
    }
}
