package pe.pucp.paqtracker.modulos.incidencias.dominio;

import java.util.List;

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
}
