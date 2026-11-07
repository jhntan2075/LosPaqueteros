package pe.pucp.paqtracker.modulos.configuracion.dominio;

import pe.pucp.paqtracker.modelo.ParametrosDominio;

/**
 * Entrega los parametros del dominio vigentes (B02, B04, B07-B09). Cada ejecucion nueva los consulta al
 * crearse y se queda con esa copia: un cambio posterior no la altera.
 */
@FunctionalInterface
public interface FuenteParametrosDominio {

    /**
     * @return parametros vigentes
     */
    ParametrosDominio vigentes();
}
