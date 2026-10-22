package pe.pucp.paqtracker.modulos.incidencias.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.OperacionNoPermitidaException;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.incidencias.dominio.AveriaRegistrada;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioAveria;

import java.time.Clock;

/**
 * Deshace una averia registrada por error (CU-13) mientras sigue programada: la retira de la agenda del
 * motor, que aun no la aplica, y marca su registro como cancelado. Una averia ya aplicada no se deshace.
 */
@Service
public class CasoUsoCancelarAveria {

    private final ServicioEjecucion servicioEjecucion;
    private final RepositorioAveria repositorio;
    private final Clock relojPared;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param repositorio       persistencia de averias
     * @param relojPared        reloj real, para la fecha de la cancelacion
     */
    public CasoUsoCancelarAveria(ServicioEjecucion servicioEjecucion, RepositorioAveria repositorio,
                                 Clock relojPared) {
        this.servicioEjecucion = servicioEjecucion;
        this.repositorio = repositorio;
        this.relojPared = relojPared;
    }

    /**
     * @param ejecucionId ejecucion de la averia
     * @param averiaId    identificador del registro de la averia
     * @throws RecursoNoEncontradoException  si la averia no existe en esa ejecucion
     * @throws OperacionNoPermitidaException si ya estaba cancelada o el motor ya la aplico
     */
    public void ejecutar(String ejecucionId, long averiaId) {
        AveriaRegistrada averia = repositorio.buscar(averiaId)
                .filter(registrada -> registrada.ejecucionId().equals(ejecucionId))
                .orElseThrow(() -> new RecursoNoEncontradoException("averia", averiaId + " en la ejecucion "
                        + ejecucionId));
        if (averia.canceladaEn() != null) {
            throw new OperacionNoPermitidaException("La averia de " + averia.codigoUnidad() + " ya estaba cancelada");
        }
        servicioEjecucion.cancelarAveria(ejecucionId, averia.codigoUnidad());
        repositorio.marcarCancelada(averiaId, relojPared.instant());
    }
}
