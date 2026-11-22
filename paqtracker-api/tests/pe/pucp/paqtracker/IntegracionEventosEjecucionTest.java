package pe.pucp.paqtracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Prueba de punta a punta del historial de eventos: {@code GET /api/ejecuciones/{id}/eventos} devuelve lo que la
 * ejecucion ya difundio, aunque el cliente se conecte despues.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IntegracionEventosEjecucionTest {

    private static final ParameterizedTypeReference<List<Map<String, Object>>> LISTA_DE_EVENTOS =
            new ParameterizedTypeReference<>() { };

    @LocalServerPort
    private int puerto;

    @Test
    void eventos_ejecucionDesconocida_respondeVacioSinError() {
        RestClient cliente = RestClient.create("http://localhost:" + puerto);

        ResponseEntity<List<Map<String, Object>>> respuesta = cliente.get()
                .uri("/api/ejecuciones/{id}/eventos", "no-existe").retrieve().toEntity(LISTA_DE_EVENTOS);

        assertEquals(200, respuesta.getStatusCode().value());
        assertEquals(List.of(), respuesta.getBody());
    }

    @Test
    void eventos_trasIniciarYDetener_devuelveElHistorialDelMasRecienteAlMasAntiguo() {
        RestClient cliente = RestClient.create("http://localhost:" + puerto);
        Map<?, ?> creada = cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "SIMULACION_PERIODO", "fechaInicio", "2026-01-01", "dias", 1))
                .retrieve().body(Map.class);
        String id = (String) creada.get("id");
        cliente.post().uri("/api/ejecuciones/{id}/iniciar", id).retrieve().toBodilessEntity();
        cliente.post().uri("/api/ejecuciones/{id}/detener", id).retrieve().toBodilessEntity();

        List<Map<String, Object>> eventos = cliente.get().uri("/api/ejecuciones/{id}/eventos", id).retrieve()
                .body(LISTA_DE_EVENTOS);

        assertNotNull(eventos);
        assertTrue(eventos.stream().anyMatch(e -> "EJECUCION_FINALIZADA".equals(e.get("tipo"))));
        for (Map<String, Object> evento : eventos) {
            assertEquals(id, evento.get("ejecucionId"));
            assertNotNull(evento.get("id"));
            assertNotNull(evento.get("mensaje"));
            assertNotNull(evento.get("timestampSimuladoMs"));
        }
        for (int i = 1; i < eventos.size(); i++) {
            long anterior = ((Number) eventos.get(i - 1).get("timestampSimuladoMs")).longValue();
            long actual = ((Number) eventos.get(i).get("timestampSimuladoMs")).longValue();
            assertTrue(anterior >= actual, "Los eventos deben venir del mas reciente al mas antiguo");
        }
    }

    @Test
    void eventos_conLimite_devuelveSoloLosMasRecientes() {
        RestClient cliente = RestClient.create("http://localhost:" + puerto);
        Map<?, ?> creada = cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("tipoEscenario", "SIMULACION_PERIODO", "fechaInicio", "2026-01-01", "dias", 1))
                .retrieve().body(Map.class);
        String id = (String) creada.get("id");
        cliente.post().uri("/api/ejecuciones/{id}/iniciar", id).retrieve().toBodilessEntity();
        cliente.post().uri("/api/ejecuciones/{id}/detener", id).retrieve().toBodilessEntity();

        List<Map<String, Object>> uno = cliente.get().uri("/api/ejecuciones/{id}/eventos?limite=1", id).retrieve()
                .body(LISTA_DE_EVENTOS);
        List<Map<String, Object>> todos = cliente.get().uri("/api/ejecuciones/{id}/eventos?limite=100000", id)
                .retrieve().body(LISTA_DE_EVENTOS);

        assertEquals(1, uno.size());
        assertEquals(todos.get(0).get("id"), uno.get(0).get("id"));
        assertTrue(todos.size() <= 800);
    }
}
