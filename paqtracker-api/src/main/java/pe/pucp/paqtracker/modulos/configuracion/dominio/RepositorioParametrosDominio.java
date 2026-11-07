package pe.pucp.paqtracker.modulos.configuracion.dominio;

import pe.pucp.paqtracker.modelo.ParametrosDominio;
import java.time.Instant;
import java.util.Optional;

/**
 * Persistencia de los parametros del dominio: una sola configuracion para toda la API.
 */
public interface RepositorioParametrosDominio {

    /**
     * @return parametros guardados, o vacio si el operador aun no los cambio
     */
    Optional<ParametrosDominio> buscar();

    /**
     * @param parametros    parametros a guardar, ya validados
     * @param actualizadoEn instante real del cambio
     * @return parametros guardados
     */
    ParametrosDominio guardar(ParametrosDominio parametros, Instant actualizadoEn);

    /** Borra los parametros guardados: rigen otra vez los valores por defecto. */
    void borrar();
}
