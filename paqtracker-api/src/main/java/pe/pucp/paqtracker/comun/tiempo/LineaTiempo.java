package pe.pucp.paqtracker.comun.tiempo;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Relaciona el minuto simulado de una ejecucion (minuto cero = inicio de su horizonte) con la fecha y
 * hora que representa. El nucleo trabaja en minutos enteros; la API y el front, en fechas.
 */
public final class LineaTiempo {

    private static final double MILISEGUNDOS_POR_MINUTO = 60_000.0;
    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private final ZonedDateTime minutoCero;

    /**
     * @param minutoCero fecha y hora del minuto cero de la ejecucion
     * @throws IllegalArgumentException si la fecha es nula
     */
    public LineaTiempo(ZonedDateTime minutoCero) {
        if (minutoCero == null) {
            throw new IllegalArgumentException("El minuto cero de la linea de tiempo es obligatorio");
        }
        this.minutoCero = minutoCero;
    }

    /**
     * @param minuto minuto simulado, con fraccion
     * @return instante epoch en milisegundos que representa
     */
    public long aMilisegundos(double minuto) {
        return minutoCero.toInstant().toEpochMilli() + Math.round(minuto * MILISEGUNDOS_POR_MINUTO);
    }

    /**
     * @param minuto minuto simulado, con fraccion
     * @return fecha y hora que representa, en la zona de la ejecucion
     */
    public ZonedDateTime aFecha(double minuto) {
        return Instant.ofEpochMilli(aMilisegundos(minuto)).atZone(minutoCero.getZone());
    }

    /**
     * @param fecha fecha y hora en cualquier zona
     * @return minuto simulado que le corresponde, con fraccion
     */
    public double aMinuto(ZonedDateTime fecha) {
        long diferencia = fecha.toInstant().toEpochMilli() - minutoCero.toInstant().toEpochMilli();
        return diferencia / MILISEGUNDOS_POR_MINUTO;
    }

    /**
     * @param minuto minuto simulado
     * @return fecha y hora en formato dd/MM/yyyy HH:mm:ss
     */
    public String formatear(double minuto) {
        return aFecha(minuto).format(FORMATO);
    }

    /**
     * @param fecha fecha y hora
     * @return fecha y hora en formato dd/MM/yyyy HH:mm:ss
     */
    public static String formatear(ZonedDateTime fecha) {
        return fecha.format(FORMATO);
    }

    public ZonedDateTime getMinutoCero() {
        return minutoCero;
    }
}
