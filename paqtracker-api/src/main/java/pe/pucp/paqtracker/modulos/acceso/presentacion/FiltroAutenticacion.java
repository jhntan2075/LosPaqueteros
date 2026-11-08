package pe.pucp.paqtracker.modulos.acceso.presentacion;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.ServicioSesiones;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Exige una sesion vigente en las rutas {@code /api/**}. Quedan abiertas:
 * <ul>
 *   <li>{@code /api/sesion}: es donde se obtiene la sesion;</li>
 *   <li>{@code GET /api/ejecuciones}: la verificacion del despliegue (rubrica A20) la consulta sin
 *       credenciales y espera 200. Solo lista las ejecuciones, sin pedidos ni flota;</li>
 *   <li>las solicitudes {@code OPTIONS}.</li>
 * </ul>
 * El handshake de {@code /ws} no pasa por aqui (A21); STOMP se protege en {@link InterceptorStompSesion}.
 */
public class FiltroAutenticacion extends OncePerRequestFilter {

    private static final String RUTA_SESION = "/api/sesion";
    private static final String RUTA_EJECUCIONES = "/api/ejecuciones";
    private static final String CUERPO_401 = "{\"estado\":401,\"error\":\"Unauthorized\","
            + "\"mensaje\":\"Inicie sesión para continuar\",\"detalles\":[]}";

    private final ServicioSesiones servicio;

    /**
     * @param servicio sesiones vigentes
     */
    public FiltroAutenticacion(ServicioSesiones servicio) {
        this.servicio = servicio;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest solicitud) {
        if (!servicio.seguridadActiva() || "OPTIONS".equals(solicitud.getMethod())) {
            return true;
        }
        String ruta = rutaSinContexto(solicitud);
        if (!ruta.startsWith("/api/")) {
            return true;
        }
        if (ruta.equals(RUTA_SESION) || ruta.equals(RUTA_SESION + "/")) {
            return true;
        }
        return "GET".equals(solicitud.getMethod())
                && (ruta.equals(RUTA_EJECUCIONES) || ruta.equals(RUTA_EJECUCIONES + "/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest solicitud, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        String token = ServicioSesiones.tokenDe(solicitud.getHeader(HttpHeaders.AUTHORIZATION));
        if (servicio.validar(token).isPresent()) {
            cadena.doFilter(solicitud, respuesta);
            return;
        }
        respuesta.setStatus(HttpStatus.UNAUTHORIZED.value());
        respuesta.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        respuesta.setContentType(MediaType.APPLICATION_JSON_VALUE);
        respuesta.setCharacterEncoding(StandardCharsets.UTF_8.name());
        respuesta.getWriter().write(CUERPO_401);
    }

    private static String rutaSinContexto(HttpServletRequest solicitud) {
        String ruta = solicitud.getRequestURI();
        String contexto = solicitud.getContextPath();
        return contexto != null && !contexto.isEmpty() && ruta.startsWith(contexto) ? ruta.substring(contexto.length()) : ruta;
    }
}
