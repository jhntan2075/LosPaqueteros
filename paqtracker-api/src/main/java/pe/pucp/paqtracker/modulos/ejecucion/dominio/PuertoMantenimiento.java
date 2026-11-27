package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.time.LocalDate;
import java.util.List;

/**
 * Puerto por el que el modulo de ejecucion lee el plan de mantenimiento preventivo guardado en la base.
 */
public interface PuertoMantenimiento {

    /**
     * Una unidad en el taller un dia.
     *
     * @param fecha       dia en el taller
     * @param tipo        tipo de la unidad
     * @param correlativo numero de la unidad dentro de su tipo, desde 1 (TA01 es el auto 1)
     */
    record MantenimientoFuente(LocalDate fecha, TipoVehiculo tipo, int correlativo) {
    }

    /**
     * @param desde primer dia, inclusive
     * @param hasta ultimo dia, inclusive
     * @return mantenimientos de esos dias
     */
    List<MantenimientoFuente> entre(LocalDate desde, LocalDate hasta);
}
