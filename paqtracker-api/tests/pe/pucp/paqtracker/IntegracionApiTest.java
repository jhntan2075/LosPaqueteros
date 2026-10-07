package pe.pucp.paqtracker;

import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Prueba de punta a punta: crea una simulacion de periodo con los fixtures, la inicia y comprueba que
 * su estado llega por STOMP a un cliente suscrito, como lo recibiria cualquier dispositivo.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IntegracionApiTest {

    private static final long ESPERA_SEGUNDOS = 10;
    private static final int UNIDADES_FLOTA = 37;
    private static final int BUFFER_MENSAJE_BYTES = 1024 * 1024;

    @LocalServerPort
    private int puerto;

    @Test
    void simulacionPeriodo_iniciada_difundeSuEstadoPorStomp() throws Exception {
        RestClient cliente = RestClient.create("http://localhost:" + puerto);
        Map<?, ?> creada = cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "SIMULACION_PERIODO", "fechaInicio", "2026-01-01", "dias", 2))
                .retrieve().body(Map.class);
        String id = (String) creada.get("id");
        assertEquals("CONFIGURADA", creada.get("estado"));

        BlockingQueue<Map<?, ?>> recibidos = new LinkedBlockingQueue<>();
        StompSession sesion = conectar();
        sesion.subscribe("/topic/ejecuciones/" + id + "/estado", manejador(recibidos));
        // La suscripcion se confirma de forma asincrona; una espera breve evita perder el primer mensaje.
        TimeUnit.MILLISECONDS.sleep(300);

        Map<?, ?> iniciada = cliente.post().uri("/api/ejecuciones/{id}/iniciar", id).retrieve().body(Map.class);
        assertEquals("EN_CURSO", iniciada.get("estado"));

        Map<?, ?> mensaje = recibidos.poll(ESPERA_SEGUNDOS, TimeUnit.SECONDS);
        assertNotNull(mensaje, "No llego ninguna instantanea por STOMP");
        assertEquals(id, mensaje.get("ejecucionId"));
        assertEquals(UNIDADES_FLOTA, ((List<?>) mensaje.get("unidades")).size());

        Map<?, ?> estado = cliente.get().uri("/api/ejecuciones/{id}/estado", id).retrieve().body(Map.class);
        assertEquals(UNIDADES_FLOTA, ((List<?>) estado.get("unidades")).size());

        Map<?, ?> detenida = cliente.post().uri("/api/ejecuciones/{id}/detener", id).retrieve().body(Map.class);
        assertEquals("FINALIZADA", detenida.get("estado"));
        sesion.disconnect();
    }

    @Test
    void simulacionPeriodo_conFlotaConfigurada_difundeSoloEsasUnidades() {
        RestClient cliente = RestClient.create("http://localhost:" + puerto);
        Map<?, ?> creada = cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "SIMULACION_PERIODO", "fechaInicio", "2026-01-01", "dias", 1,
                        "flota", Map.of("autos", 2, "motos", 2, "bicicletas", 2)))
                .retrieve().body(Map.class);
        String id = (String) creada.get("id");

        Map<?, ?> estado = cliente.get().uri("/api/ejecuciones/{id}/estado", id).retrieve().body(Map.class);
        List<?> unidades = (List<?>) estado.get("unidades");

        assertEquals(6, unidades.size());
        assertEquals("B-02", ((Map<?, ?>) unidades.get(5)).get("codigo"));
        cliente.post().uri("/api/ejecuciones/{id}/detener", id).retrieve().toBodilessEntity();
    }

    @Test
    void importarBloqueos_archivoConLineasInvalidas_lasInformaYNoLoGuarda() {
        RestClient cliente = RestClient.create("http://localhost:" + puerto);
        MultiValueMap<String, Object> formulario = new LinkedMultiValueMap<>();
        formulario.add("mes", "202601");
        formulario.add("file", new ByteArrayResource("01d02h22m-01d04h42m:25,45,30,40\nroto\n"
                .getBytes(StandardCharsets.UTF_8)) {
            @Override
            public String getFilename() {
                return "bloqueo.2601.txt";
            }
        });

        Map<?, ?> respuesta = cliente.post().uri("/api/archivos/bloqueos").contentType(MediaType.MULTIPART_FORM_DATA)
                .body(formulario).retrieve().body(Map.class);

        assertEquals(List.of(1, 2), respuesta.get("lineasInvalidas"));
        assertEquals(false, respuesta.get("guardado"));
    }

    @Test
    void errores_solicitudesInvalidas_respondenConElCodigoAdecuado() {
        RestClient cliente = RestClient.create("http://localhost:" + puerto);

        assertEquals(404, estado(cliente.get().uri("/api/ejecuciones/no-existe")));
        assertEquals(400, estado(cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "DIA_A_DIA", "fechaInicio", "2026-01-01"))));
        assertEquals(400, estado(cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "SIMULACION_PERIODO", "fechaInicio", "2030-01-01"))));
        assertEquals(200, estado(cliente.get().uri("/api/configuracion/dominio")));
        assertEquals(400, estado(cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "SIMULACION_PERIODO", "fechaInicio", "2026-01-01",
                        "flota", Map.of("autos", 0, "motos", 0, "bicicletas", 0)))));
        assertEquals(400, estado(cliente.get().uri("/api/pedidos/XYZ?ejecucionId=no-existe")));
    }

    private static int estado(RestClient.RequestHeadersSpec<?> solicitud) {
        HttpStatusCode codigo = solicitud.exchange((peticion, respuesta) -> respuesta.getStatusCode());
        return codigo.value();
    }

    private StompSession conectar() throws Exception {
        // El contenedor WebSocket de Tomcat corta mensajes de mas de 8 KB por defecto; una instantanea
        // con toda la flota es mayor. Los navegadores no tienen ese limite.
        WebSocketContainer contenedor = ContainerProvider.getWebSocketContainer();
        contenedor.setDefaultMaxTextMessageBufferSize(BUFFER_MENSAJE_BYTES);
        WebSocketStompClient stomp = new WebSocketStompClient(new StandardWebSocketClient(contenedor));
        stomp.setMessageConverter(new JacksonJsonMessageConverter());
        return stomp.connectAsync("ws://localhost:" + puerto + "/ws", new StompSessionHandlerAdapter() {
        }).get(ESPERA_SEGUNDOS, TimeUnit.SECONDS);
    }

    private static StompFrameHandler manejador(BlockingQueue<Map<?, ?>> destino) {
        return new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders cabeceras) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders cabeceras, Object carga) {
                destino.add((Map<?, ?>) carga);
            }
        };
    }
}
