package pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modelo.ParametrosDominio;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteParametrosDominio;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RepositorioParametrosDominio;
import java.time.Clock;

/**
 * Parametros del dominio que el operador consulta y cambia desde la interfaz (B02, B04, B07-B09). Se
 * guardan en la base y se mantienen en memoria. Rigen para las ejecuciones que se crean despues del
 * cambio; las que estan en curso conservan la copia que tomaron al crearse.
 */
@Service
public class ServicioParametrosDominio implements FuenteParametrosDominio {

    private static final Logger LOGGER = LoggerFactory.getLogger(ServicioParametrosDominio.class);

    private final RepositorioParametrosDominio repositorio;
    private final Clock relojPared;
    private volatile ParametrosDominio vigentes;

    /**
     * @param repositorio persistencia de los parametros
     * @param relojPared  reloj real, para la fecha del cambio
     */
    public ServicioParametrosDominio(RepositorioParametrosDominio repositorio, Clock relojPared) {
        this.repositorio = repositorio;
        this.relojPared = relojPared;
        this.vigentes = repositorio.buscar().orElseGet(ParametrosDominio::porDefecto);
    }

    @Override
    public ParametrosDominio vigentes() {
        return vigentes;
    }

    /**
     * @param nuevos parametros validados
     * @return parametros guardados, que rigen para las ejecuciones nuevas
     */
    public synchronized ParametrosDominio actualizar(ParametrosDominio nuevos) {
        vigentes = repositorio.guardar(nuevos, relojPared.instant());
        LOGGER.info("Parámetros del dominio actualizados: {}", vigentes);
        return vigentes;
    }

    /**
     * Vuelve a los valores por defecto de {@code ConfiguracionDominio}.
     *
     * @return parametros por defecto
     */
    public synchronized ParametrosDominio restablecer() {
        repositorio.borrar();
        vigentes = ParametrosDominio.porDefecto();
        LOGGER.info("Parámetros del dominio restablecidos a los valores por defecto");
        return vigentes;
    }
}
