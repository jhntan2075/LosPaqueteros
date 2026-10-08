package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.ContextoInstantanea;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.dominio.PuertoDifusion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
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

    /**
     * @param constructorInstantanea constructor de la instantanea
     * @param puertoDifusion         canal de difusion
     */
    public ServicioDifusion(ConstructorInstantanea constructorInstantanea, PuertoDifusion puertoDifusion) {
        this.constructorInstantanea = constructorInstantanea;
        this.puertoDifusion = puertoDifusion;
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
     * Difunde un evento puntual de la ejecucion.
     *
     * @param ejecucionId         ejecucion
     * @param tipo                tipo de evento
     * @param mensaje             texto para la bitacora
     * @param timestampSimuladoMs instante simulado del evento
     * @param detalle             datos adicionales
     */
    public void difundirEvento(String ejecucionId, String tipo, String mensaje, long timestampSimuladoMs,
                               Map<String, Object> detalle) {
        puertoDifusion.publicarEvento(new MensajeEventoEjecucion(UUID.randomUUID().toString(), ejecucionId, tipo,
                mensaje, timestampSimuladoMs, detalle));
    }
}
