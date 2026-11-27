package pe.pucp.paqtracker.modulos.incidencias.dominio;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Puerto de persistencia del plan de mantenimiento preventivo.
 */
public interface RepositorioMantenimiento {

    /**
     * @return todo el plan guardado, por fecha y unidad
     */
    List<MantenimientoRegistrado> listarTodos();

    /**
     * @param desde primer dia, inclusive
     * @param hasta ultimo dia, inclusive
     * @return intervenciones de esos dias, por fecha y unidad
     */
    List<MantenimientoRegistrado> listarEntre(LocalDate desde, LocalDate hasta);

    /**
     * @param nuevas intervenciones a guardar
     */
    void guardarTodos(Collection<MantenimientoRegistrado> nuevas);

    /**
     * @param ids identificadores de las intervenciones a borrar
     */
    void borrar(Collection<Long> ids);
}
