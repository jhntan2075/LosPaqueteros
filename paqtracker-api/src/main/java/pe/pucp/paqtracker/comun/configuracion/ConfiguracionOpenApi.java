package pe.pucp.paqtracker.comun.configuracion;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Datos generales de la documentacion OpenAPI que springdoc publica en {@code /v3/api-docs} y muestra
 * en Swagger UI ({@code /swagger-ui.html}). Las rutas se documentan solas a partir de los controladores.
 */
@Configuration
public class ConfiguracionOpenApi {

    /**
     * @return descripcion del servicio para la documentacion
     */
    @Bean
    public OpenAPI documentacionApi() {
        return new OpenAPI().info(new Info()
                .title("PaqTracker API")
                .version("v1")
                .description("API de operacion de PaqTracker: registro de pedidos, carga de archivos de entrada, "
                        + "ejecuciones (dia a dia, simulacion de periodo y colapso) y configuracion del dominio. "
                        + "El estado en vivo de cada ejecucion se difunde por STOMP en /ws."));
    }
}
