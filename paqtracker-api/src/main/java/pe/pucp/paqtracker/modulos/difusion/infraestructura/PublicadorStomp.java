package pe.pucp.paqtracker.modulos.difusion.infraestructura;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.dominio.PuertoDifusion;

/**
 * Difunde por el broker STOMP en memoria: un topico de estado y uno de eventos por ejecucion.
 */
@Component
public class PublicadorStomp implements PuertoDifusion {

    private static final String TOPICO_EJECUCIONES = "/topic/ejecuciones/";

    private final SimpMessagingTemplate plantilla;

    /**
     * @param plantilla plantilla de mensajeria de Spring
     */
    public PublicadorStomp(SimpMessagingTemplate plantilla) {
        this.plantilla = plantilla;
    }

    @Override
    public void publicarEstado(MensajeEstadoEjecucion mensaje) {
        plantilla.convertAndSend(TOPICO_EJECUCIONES + mensaje.ejecucionId() + "/estado", mensaje);
    }

    @Override
    public void publicarEvento(MensajeEventoEjecucion mensaje) {
        plantilla.convertAndSend(TOPICO_EJECUCIONES + mensaje.ejecucionId() + "/eventos", mensaje);
    }
}
