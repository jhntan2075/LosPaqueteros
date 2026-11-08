package pe.pucp.paqtracker.modulos.acceso.presentacion;

import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.ServicioSesiones;

/**
 * Pide el token de la sesion en el {@code CONNECT} de STOMP (cabecera nativa {@code Authorization:
 * Bearer <token>}). Sin token vigente el broker responde con una trama ERROR y cierra la conexion, asi
 * que no se recibe ningun topico. El handshake HTTP de {@code /ws} sigue abierto y responde 101 (A21).
 */
public class InterceptorStompSesion implements ChannelInterceptor {

    private final ServicioSesiones servicio;

    /**
     * @param servicio sesiones vigentes
     */
    public InterceptorStompSesion(ServicioSesiones servicio) {
        this.servicio = servicio;
    }

    @Override
    public Message<?> preSend(Message<?> mensaje, MessageChannel canal) {
        if (!servicio.seguridadActiva()) {
            return mensaje;
        }
        StompHeaderAccessor cabeceras = MessageHeaderAccessor.getAccessor(mensaje, StompHeaderAccessor.class);
        if (cabeceras != null && StompCommand.CONNECT.equals(cabeceras.getCommand())) {
            String token = ServicioSesiones.tokenDe(cabeceras.getFirstNativeHeader(HttpHeaders.AUTHORIZATION));
            if (servicio.validar(token).isEmpty()) {
                throw new MessageDeliveryException("Inicie sesión para recibir el estado en vivo");
            }
        }
        return mensaje;
    }
}
