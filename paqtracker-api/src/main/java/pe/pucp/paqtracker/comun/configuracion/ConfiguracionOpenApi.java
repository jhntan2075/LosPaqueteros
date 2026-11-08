package pe.pucp.paqtracker.comun.configuracion;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Datos generales de la documentacion OpenAPI que springdoc publica en {@code /v3/api-docs} y muestra
 * en Swagger UI ({@code /swagger-ui.html}). Las rutas se documentan solas a partir de los controladores.
 */
@Configuration
public class ConfiguracionOpenApi {

    private static final String ESQUEMA_SESION = "sesion";

    /**
     * @return descripcion del servicio para la documentacion
     */
    @Bean
    public OpenAPI documentacionApi() {
        return new OpenAPI().info(new Info()
                .title("PaqTracker API")
                .version("v1")
                .description("API de operación de PaqTracker: registro de pedidos, carga de archivos de entrada, "
                        + "ejecuciones (día a día, simulación de periodo y colapso) y configuración del dominio. "
                        + "El estado en vivo de cada ejecución se difunde por STOMP en /ws. Salvo POST /api/sesion "
                        + "y GET /api/ejecuciones, las rutas piden el token de POST /api/sesion (botón Authorize)."))
                .components(new Components().addSecuritySchemes(ESQUEMA_SESION,
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer")))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA_SESION));
    }
}
