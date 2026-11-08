package pe.pucp.paqtracker.modulos.acceso;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.client.RestClient;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Login por HTTP y STOMP con la seguridad activa: rutas cerradas sin sesion, las que quedan abiertas para
 * la verificacion del despliegue (A20, A21) y el ciclo iniciar, usar y cerrar sesion.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IntegracionAccesoTest {

    private static final String USUARIO = "operaciones";
    private static final String CLAVE = "clave-de-prueba";
    private static final long ESPERA_SEGUNDOS = 5;

    @LocalServerPort
    private int puerto;

    @DynamicPropertySource
    static void seguridad(DynamicPropertyRegistry registro) {
        registro.add("paqtracker.seguridad.activa", () -> true);
        registro.add("paqtracker.seguridad.usuario", () -> USUARIO);
        registro.add("paqtracker.seguridad.clave-hash", () -> new BCryptPasswordEncoder().encode(CLAVE));
    }

    @Test
    void sinSesion_laVerificacionDelDespliegueSigueRespondiendo200() {
        assertEquals(200, estado(cliente().get().uri("/api/ejecuciones")));
    }

    @Test
    void sinSesion_lasDemasRutasResponden401ConElCuerpoDeError() {
        Map<?, ?> cuerpo = cliente().get().uri("/api/configuracion/semaforo")
                .exchange((peticion, respuesta) -> {
                    assertEquals(401, respuesta.getStatusCode().value());
                    return respuesta.bodyTo(Map.class);
                });
        assertEquals("Inicie sesión para continuar", cuerpo.get("mensaje"));
        assertEquals(401, estado(cliente().post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "SIMULACION_PERIODO", "fechaInicio", "2026-01-01", "dias", 1))));
        assertEquals(401, estado(cliente().get().uri("/api/pedidos?ejecucionId=dia-a-dia")));
        assertEquals(401, estado(cliente().get().uri("/api/configuracion/semaforo")
                .header(HttpHeaders.AUTHORIZATION, "Bearer token-inventado")));
    }

    @Test
    void credencialesIncorrectas_responden401SinDecirQueCampoFallo() {
        Map<?, ?> cuerpo = cliente().post().uri("/api/sesion").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("usuario", USUARIO, "clave", "otra-clave"))
                .exchange((peticion, respuesta) -> {
                    assertEquals(401, respuesta.getStatusCode().value());
                    return respuesta.bodyTo(Map.class);
                });
        assertEquals("Usuario o contraseña incorrectos", cuerpo.get("mensaje"));
        assertEquals(400, estado(cliente().post().uri("/api/sesion").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("usuario", "", "clave", ""))));
    }

    @Test
    void sesion_seIniciaSeUsaYSeCierra() {
        Map<?, ?> estadoInicial = cliente().get().uri("/api/sesion").retrieve().body(Map.class);
        assertEquals(true, estadoInicial.get("seguridadActiva"));
        assertEquals(false, estadoInicial.get("autenticado"));

        String token = iniciarSesion();
        String bearer = "Bearer " + token;

        assertEquals(200, estado(cliente().get().uri("/api/configuracion/semaforo").header(HttpHeaders.AUTHORIZATION, bearer)));
        Map<?, ?> estadoSesion = cliente().get().uri("/api/sesion").header(HttpHeaders.AUTHORIZATION, bearer)
                .retrieve().body(Map.class);
        assertEquals(true, estadoSesion.get("autenticado"));
        assertEquals(USUARIO, estadoSesion.get("usuario"));
        assertTrue(((Number) estadoSesion.get("expiraEnMs")).longValue() > System.currentTimeMillis());

        assertEquals(204, estado(cliente().delete().uri("/api/sesion").header(HttpHeaders.AUTHORIZATION, bearer)));
        assertEquals(401, estado(cliente().get().uri("/api/configuracion/semaforo").header(HttpHeaders.AUTHORIZATION, bearer)));
    }

    @Test
    void stomp_sinTokenSeRechazaYConTokenConecta() throws Exception {
        assertThrows(Exception.class, () -> conectarStomp(new StompHeaders()).get(ESPERA_SEGUNDOS, TimeUnit.SECONDS));

        StompHeaders conToken = new StompHeaders();
        conToken.add(HttpHeaders.AUTHORIZATION, "Bearer " + iniciarSesion());
        StompSession sesion = conectarStomp(conToken).get(ESPERA_SEGUNDOS, TimeUnit.SECONDS);
        assertTrue(sesion.isConnected());
        sesion.disconnect();
    }

    @Test
    void openApi_sigueAbierta() {
        Map<?, ?> documento = cliente().get().uri("/v3/api-docs").retrieve().body(Map.class);
        assertNotNull(((Map<?, ?>) documento.get("paths")).get("/api/sesion"));
        assertFalse(documento.isEmpty());
    }

    private String iniciarSesion() {
        Map<?, ?> respuesta = cliente().post().uri("/api/sesion").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("usuario", USUARIO, "clave", CLAVE)).retrieve().body(Map.class);
        String token = (String) respuesta.get("token");
        assertNotNull(token);
        assertEquals(USUARIO, respuesta.get("usuario"));
        return token;
    }

    private java.util.concurrent.CompletableFuture<StompSession> conectarStomp(StompHeaders cabeceras) {
        WebSocketStompClient stomp = new WebSocketStompClient(new StandardWebSocketClient());
        stomp.setMessageConverter(new JacksonJsonMessageConverter());
        return stomp.connectAsync("ws://localhost:" + puerto + "/ws", new WebSocketHttpHeaders(), cabeceras,
                new StompSessionHandlerAdapter() {
                });
    }

    private static int estado(RestClient.RequestHeadersSpec<?> solicitud) {
        HttpStatusCode codigo = solicitud.exchange((peticion, respuesta) -> respuesta.getStatusCode());
        return codigo.value();
    }

    private RestClient cliente() {
        return RestClient.create("http://localhost:" + puerto);
    }
}
