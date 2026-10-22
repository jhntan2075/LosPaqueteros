package pe.pucp.paqtracker.modulos.incidencias.dominio;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de salida para persistir las averias registradas manualmente.
 */
public interface RepositorioAveria {

    /**
     * @param averia averia a guardar
     * @return averia guardada, con su identificador
     */
    AveriaRegistrada guardar(AveriaRegistrada averia);

    /**
     * @param ejecucionId ejecucion
     * @return averias registradas en esa ejecucion, en orden de registro
     */
    List<AveriaRegistrada> listarPorEjecucion(String ejecucionId);

    /**
     * @param id identificador del registro
     * @return la averia, o vacio si no existe
     */
    Optional<AveriaRegistrada> buscar(long id);

    /**
     * @param id          identificador del registro
     * @param canceladaEn instante real de la cancelacion
     * @return la averia con su cancelacion
     */
    AveriaRegistrada marcarCancelada(long id, Instant canceladaEn);
}
