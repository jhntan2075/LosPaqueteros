package pe.pucp.paqtracker.comun.archivos;

import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Mes al que corresponde un archivo de entrada, en el formato YYYYMM de los nombres de archivo.
 */
public final class MesArchivo {

    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("yyyyMM");

    /**
     * @param mes texto en formato YYYYMM
     * @return mes interpretado
     * @throws SolicitudInvalidaException si el texto es nulo o no tiene el formato YYYYMM
     */
    public static YearMonth interpretar(String mes) {
        if (mes == null) {
            throw new SolicitudInvalidaException("El mes es obligatorio, en formato YYYYMM");
        }
        try {
            return YearMonth.parse(mes.trim(), FORMATO);
        } catch (DateTimeParseException excepcion) {
            throw new SolicitudInvalidaException("El mes debe tener formato YYYYMM: " + mes, excepcion);
        }
    }

    private MesArchivo() {
    }
}
