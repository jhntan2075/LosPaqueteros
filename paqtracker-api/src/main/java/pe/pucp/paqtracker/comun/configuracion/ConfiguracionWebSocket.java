package pe.pucp.paqtracker.comun.configuracion;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP sobre WebSocket nativo (sin SockJS) en {@code /ws}. El estado de cada ejecucion se difunde en
 * {@code /topic/ejecuciones/{id}/estado} y sus eventos en {@code /topic/ejecuciones/{id}/eventos}.
 */
@Configuration
@EnableWebSocketMessageBroker
public class ConfiguracionWebSocket implements WebSocketMessageBrokerConfigurer {

    private static final String ENDPOINT = "/ws";
    private static final String PREFIJO_TOPICOS = "/topic";
    private static final String PREFIJO_APLICACION = "/app";

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registro) {
        // El front se sirve por el mismo origen (Nginx o proxy de Vite); se admite cualquier origen
        // porque cualquier dispositivo puede conectarse a ver un escenario y no hay datos sensibles.
        registro.addEndpoint(ENDPOINT).setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registro) {
        registro.enableSimpleBroker(PREFIJO_TOPICOS);
        registro.setApplicationDestinationPrefixes(PREFIJO_APLICACION);
    }
}
