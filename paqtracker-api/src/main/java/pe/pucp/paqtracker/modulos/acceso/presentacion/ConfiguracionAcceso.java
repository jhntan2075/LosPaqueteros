package pe.pucp.paqtracker.modulos.acceso.presentacion;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.ServicioSesiones;

/**
 * Conecta el login con la API: el filtro de {@code /api/**} y el interceptor del CONNECT de STOMP.
 * Convive con {@code ConfiguracionWebSocket}, que define el endpoint y el broker.
 */
@Configuration
public class ConfiguracionAcceso implements WebSocketMessageBrokerConfigurer {

    private final ServicioSesiones servicio;

    /**
     * @param servicio sesiones de la cuenta del equipo
     */
    public ConfiguracionAcceso(ServicioSesiones servicio) {
        this.servicio = servicio;
    }

    /**
     * @return filtro que exige sesion en {@code /api/*}
     */
    @Bean
    public FilterRegistrationBean<FiltroAutenticacion> filtroAutenticacion() {
        FilterRegistrationBean<FiltroAutenticacion> registro = new FilterRegistrationBean<>(new FiltroAutenticacion(servicio));
        registro.addUrlPatterns("/api/*");
        registro.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return registro;
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registro) {
        registro.interceptors(new InterceptorStompSesion(servicio));
    }
}
