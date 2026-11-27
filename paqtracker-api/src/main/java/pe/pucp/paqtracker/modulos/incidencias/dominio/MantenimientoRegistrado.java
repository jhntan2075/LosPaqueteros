package pe.pucp.paqtracker.modulos.incidencias.dominio;

import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.time.LocalDate;

/**
 * Intervencion del plan de mantenimiento preventivo guardada en la base.
 *
 * @param id           identificador en la base, o null si aun no se guarda
 * @param fecha        dia que la unidad pasa en el taller
 * @param codigoUnidad codigo de la unidad en el archivo (TA01, TM07, TB11)
 * @param tipo         tipo de la unidad
 * @param correlativo  numero de la unidad dentro de su tipo, desde 1
 */
public record MantenimientoRegistrado(Long id, LocalDate fecha, String codigoUnidad, TipoVehiculo tipo,
                                      int correlativo) {

    /**
     * @return clave que identifica la intervencion en el plan: fecha y unidad
     */
    public String clave() {
        return fecha + ":" + codigoUnidad;
    }
}
