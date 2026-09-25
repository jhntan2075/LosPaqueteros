package pe.pucp.paqtracker.experimento;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;

/**
 * Escritor del archivo de registro de corridas del experimento numerico.
 *
 * Varias corridas pueden ejecutarse en paralelo, cada una en su propia JVM,
 * sobre el mismo archivo de salida. Para que ninguna corrompa la fila de otra,
 * cada escritura toma un bloqueo exclusivo del archivo completo, escribe todas
 * sus filas de una vez y lo suelta. El bloqueo tambien cubre la escritura de la
 * cabecera, de modo que solo la primera corrida que llega la escribe.
 *
 * El bloqueo lo otorga el sistema operativo, no la JVM, asi que funciona entre
 * procesos distintos.
 */
public final class RegistroCsv {

    /** Cabecera del archivo de registro, en el orden que fija el diseño. */
    public static final String CABECERA = "escenario,algoritmo,repeticion,semilla,dia_corte,"
            + "fitness_acumulado,distancia_total,entregas_fuera_plazo,entregas_en_cola,colapso,"
            + "evaluaciones_usadas,tiempo_ms,dia_primer_colapso,pedidos_totales,entregas_realizadas";

    private final Path archivo;

    /**
     * @param archivo ruta del archivo de registro
     */
    public RegistroCsv(Path archivo) {
        this.archivo = archivo;
    }

    /**
     * Agrega filas al archivo bajo bloqueo exclusivo, escribiendo la cabecera
     * si el archivo aun esta vacio.
     *
     * @param filas filas a agregar, ya formateadas y sin salto de linea final
     * @throws IOException si falla la escritura o el bloqueo del archivo
     */
    public void agregar(List<String> filas) throws IOException {
        if (archivo.getParent() != null) {
            java.nio.file.Files.createDirectories(archivo.getParent());
        }
        try (FileChannel canal = FileChannel.open(archivo, StandardOpenOption.CREATE,
                StandardOpenOption.WRITE, StandardOpenOption.READ);
             FileLock bloqueo = canal.lock()) {
            StringBuilder texto = new StringBuilder();
            if (canal.size() == 0) {
                texto.append(CABECERA).append(System.lineSeparator());
            }
            for (String fila : filas) {
                texto.append(fila).append(System.lineSeparator());
            }
            canal.position(canal.size());
            canal.write(ByteBuffer.wrap(texto.toString().getBytes(StandardCharsets.UTF_8)));
            canal.force(true);
        }
    }

    /**
     * @return ruta del archivo de registro
     */
    public Path getArchivo() {
        return archivo;
    }
}
