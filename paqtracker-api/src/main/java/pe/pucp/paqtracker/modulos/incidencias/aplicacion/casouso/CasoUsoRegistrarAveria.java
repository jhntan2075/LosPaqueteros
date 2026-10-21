package pe.pucp.paqtracker.modulos.incidencias.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.OperacionNoPermitidaException;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modelo.TipoAveria;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.AveriaProgramada;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudAveriaEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto.RespuestaRegistroAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto.SolicitudRegistroAveria;
import pe.pucp.paqtracker.modulos.incidencias.dominio.AveriaRegistrada;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioAveria;
import java.time.Clock;
import java.time.Instant;

/**
 * Implementa CU-13 Registrar averia: valida la averia, la encola en la agenda del motor de la ejecucion
 * (que la aplica y replanifica en su siguiente salto Sc) y guarda su registro. No modifica el estado de la
 * simulacion directamente.
 */
@Service
public class CasoUsoRegistrarAveria {

    /** Estado de una averia ya encolada que el motor aun no aplica. */
    public static final String ESTADO_PROGRAMADA = "PROGRAMADA";

    private final ServicioEjecucion servicioEjecucion;
    private final RepositorioAveria repositorio;
    private final Clock relojPared;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param repositorio       persistencia de averias
     * @param relojPared        reloj real, para la fecha del registro
     */
    public CasoUsoRegistrarAveria(ServicioEjecucion servicioEjecucion, RepositorioAveria repositorio,
                                  Clock relojPared) {
        this.servicioEjecucion = servicioEjecucion;
        this.repositorio = repositorio;
        this.relojPared = relojPared;
    }

    /**
     * @param ejecucionId ejecucion en la que se registra la averia
     * @param solicitud   unidad y tipo de la averia
     * @return averia registrada y encolada
     * @throws SolicitudInvalidaException    si el tipo no es 1, 2 ni 3
     * @throws RecursoNoEncontradoException  si la ejecucion o la unidad no existen
     * @throws OperacionNoPermitidaException si el escenario no admite averias, la ejecucion no esta en
     *                                       curso ni pausada, o la unidad ya esta averiada
     */
    public RespuestaRegistroAveria ejecutar(String ejecucionId, SolicitudRegistroAveria solicitud) {
        TipoAveria tipo = interpretarTipo(solicitud.tipo());
        AveriaProgramada programada = servicioEjecucion.registrarAveria(ejecucionId,
                new SolicitudAveriaEnVivo(solicitud.unidad(), tipo));
        AveriaRegistrada registrada = repositorio.guardar(new AveriaRegistrada(null, programada.ejecucionId(),
                programada.codigoUnidad(), programada.tipo(), Instant.ofEpochMilli(programada.instanteMs()),
                relojPared.instant()));
        return new RespuestaRegistroAveria(registrada.id(), programada.ejecucionId(), programada.codigoUnidad(),
                programada.tipo(), ESTADO_PROGRAMADA, programada.instanteMs(), programada.reincorporacionMs(),
                programada.trasladoCentralMs());
    }

    private static TipoAveria interpretarTipo(int tipo) {
        try {
            return TipoAveria.desdeNumero(tipo);
        } catch (IllegalArgumentException excepcion) {
            throw new SolicitudInvalidaException(excepcion.getMessage(), excepcion);
        }
    }
}
