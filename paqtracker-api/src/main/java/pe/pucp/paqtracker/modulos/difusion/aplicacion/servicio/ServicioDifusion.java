package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.ContextoInstantanea;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.dominio.PuertoDifusion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Fachada del modulo de difusion. Implementa CU-25 Difundir el estado de la ejecucion: construye la
 * instantanea y los eventos y los publica para todos los clientes suscritos a la ejecucion.
 */
@Service
public class ServicioDifusion {

    private final ConstructorInstantanea constructorInstantanea;
    private final PuertoDifusion puertoDifusion;
    private final HistorialEventos historial;

    /**
     * @param constructorInstantanea constructor de la instantanea
     * @param puertoDifusion         canal de difusion
     * @param historial              historial en memoria de los eventos difundidos
     */
    public ServicioDifusion(ConstructorInstantanea constructorInstantanea, PuertoDifusion puertoDifusion,
                            HistorialEventos historial) {
        this.constructorInstantanea = constructorInstantanea;
        this.puertoDifusion = puertoDifusion;
        this.historial = historial;
    }

    /**
     * Construye la instantanea y la difunde.
     *
     * @param contexto   datos de la ejecucion
     * @param simulacion simulacion de la ejecucion; se lee en el hilo que la conduce
     * @return instantanea difundida, para que la ejecucion la guarde y la entregue a quien llegue tarde
     */
    public MensajeEstadoEjecucion difundirEstado(ContextoInstantanea contexto, SimulacionEnCurso simulacion) {
        MensajeEstadoEjecucion mensaje = constructorInstantanea.construir(contexto, simulacion);
        puertoDifusion.publicarEstado(mensaje);
        return mensaje;
    }

    /**
     * @param ejecucionId ejecucion consultada
     * @param limite      maximo de eventos a devolver
     * @return eventos ya difundidos, del mas reciente al mas antiguo; vacia si la ejecucion no difundio ninguno
     */
    public List<MensajeEventoEjecucion> historialEventos(String ejecucionId, int limite) {
        return historial.consultar(ejecucionId, limite);
    }

    /**
     * Difunde un evento puntual de la ejecucion y lo guarda en su historial.
     *
     * @param ejecucionId         ejecucion
     * @param tipo                tipo de evento
     * @param mensaje             texto para la bitacora
     * @param timestampSimuladoMs instante simulado del evento
     * @param detalle             datos adicionales
     */
    public void difundirEvento(String ejecucionId, String tipo, String mensaje, long timestampSimuladoMs,
                               Map<String, Object> detalle) {
        MensajeEventoEjecucion evento = new MensajeEventoEjecucion(UUID.randomUUID().toString(), ejecucionId, tipo,
                mensaje, timestampSimuladoMs, detalle);
        historial.registrar(evento);
        puertoDifusion.publicarEvento(evento);
    }
}
