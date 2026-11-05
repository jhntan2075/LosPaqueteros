package pe.pucp.paqtracker.modulos.configuracion.dominio;

import java.time.Instant;
import java.util.Optional;

/**
 * Persistencia de los rangos del semaforo: una sola configuracion para toda la API.
 */
public interface RepositorioRangosSemaforo {

    /**
     * @return rangos guardados, o vacio si aun no se guardo ninguno
     */
    Optional<RangosSemaforo> buscar();

    /**
     * @param rangos        rangos a guardar, ya validados
     * @param actualizadoEn instante real del cambio; null para la carga inicial
     * @return rangos guardados
     */
    RangosSemaforo guardar(RangosSemaforo rangos, Instant actualizadoEn);
}
