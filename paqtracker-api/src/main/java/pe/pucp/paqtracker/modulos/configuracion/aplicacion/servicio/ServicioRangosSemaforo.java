package pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteRangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RepositorioRangosSemaforo;
import java.time.Clock;

/**
 * Rangos del semaforo que el operador consulta y cambia desde la interfaz. Se guardan en la base y se
 * mantienen en memoria para que los motores los lean en cada difusion sin ir a la base. Si la base aun no
 * tiene rangos, los crea con los cortes de las variables de entorno.
 */
@Service
public class ServicioRangosSemaforo implements FuenteRangosSemaforo {

    private static final Logger LOGGER = LoggerFactory.getLogger(ServicioRangosSemaforo.class);

    private final RepositorioRangosSemaforo repositorio;
    private final Clock relojPared;
    private volatile RangosSemaforo vigentes;

    /**
     * @param repositorio persistencia de los rangos
     * @param propiedades cortes iniciales de holgura e inventario (APP_SEMAFORO_*, APP_INVENTARIO_*)
     * @param relojPared  reloj real, para la fecha del cambio
     */
    public ServicioRangosSemaforo(RepositorioRangosSemaforo repositorio, PropiedadesDominio propiedades,
                                  Clock relojPared) {
        this.repositorio = repositorio;
        this.relojPared = relojPared;
        this.vigentes = repositorio.buscar()
                .orElseGet(() -> repositorio.guardar(RangosSemaforo.inicial(propiedades.semaforo()), null));
    }

    /**
     * @return rangos vigentes
     */
    @Override
    public RangosSemaforo vigentes() {
        return vigentes;
    }

    /**
     * Guarda los rangos nuevos y los pone en vigor de inmediato: la siguiente difusion de cada ejecucion ya
     * los usa.
     *
     * @param nuevos rangos validados
     * @return rangos guardados
     */
    public synchronized RangosSemaforo actualizar(RangosSemaforo nuevos) {
        vigentes = repositorio.guardar(nuevos, relojPared.instant());
        LOGGER.info("Rangos del semáforo actualizados: {}", vigentes);
        return vigentes;
    }
}
