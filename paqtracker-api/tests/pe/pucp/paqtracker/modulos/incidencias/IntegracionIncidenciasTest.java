package pe.pucp.paqtracker.modulos.incidencias;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import pe.pucp.paqtracker.modulos.incidencias.dominio.AveriaRegistrada;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioAveria;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Prueba de CU-13 por HTTP: contrato de {@code POST /api/ejecuciones/{id}/averias}, codigos de error y
 * registro en la base. Cada prueba detiene las ejecuciones que crea, porque el numero de simulaciones
 * simultaneas es limitado.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IntegracionIncidenciasTest {

    private static final int ACEPTADA = 202;
    private static final int SOLICITUD_INVALIDA = 400;
    private static final int NO_ENCONTRADO = 404;
    private static final int CONFLICTO = 409;

    @LocalServerPort
    private int puerto;

    @Autowired
    private RepositorioAveria repositorio;

    @Test
    void registrarAveria_ejecucionEnCurso_respondeAceptadaYGuardaElRegistro() {
        RestClient cliente = cliente();
        String id = crear(cliente, "SIMULACION_PERIODO");
        cliente.post().uri("/api/ejecuciones/{id}/iniciar", id).retrieve().toBodilessEntity();

        Map<?, ?> respuesta = cliente.post().uri("/api/ejecuciones/{id}/averias", id)
                .contentType(MediaType.APPLICATION_JSON).body(Map.of("unidad", "m-02", "tipo", 1))
                .retrieve().body(Map.class);

        assertEquals(id, respuesta.get("ejecucionId"));
        assertEquals("M-02", respuesta.get("unidad"));
        assertEquals(1, respuesta.get("tipo"));
        assertEquals("PROGRAMADA", respuesta.get("estado"));
        assertNotNull(respuesta.get("id"));
        assertNotNull(respuesta.get("instanteMs"));
        assertNotNull(respuesta.get("reincorporacionMs"));
        assertNull(respuesta.get("trasladoCentralMs"));
        List<AveriaRegistrada> guardadas = repositorio.listarPorEjecucion(id);
        assertEquals(1, guardadas.size());
        assertEquals("M-02", guardadas.get(0).codigoUnidad());
        detener(cliente, id);
    }

    @Test
    void registrarAveria_solicitudesInvalidas_respondenConElCodigoAdecuado() {
        RestClient cliente = cliente();
        String id = crear(cliente, "SIMULACION_PERIODO");
        cliente.post().uri("/api/ejecuciones/{id}/iniciar", id).retrieve().toBodilessEntity();

        assertEquals(SOLICITUD_INVALIDA, registrar(cliente, id, Map.of("unidad", "A-01", "tipo", 7)));
        assertEquals(SOLICITUD_INVALIDA, registrar(cliente, id, Map.of("unidad", "A-01")));
        assertEquals(SOLICITUD_INVALIDA, registrar(cliente, id, Map.of("unidad", " ", "tipo", 1)));
        assertEquals(NO_ENCONTRADO, registrar(cliente, id, Map.of("unidad", "Z-99", "tipo", 1)));
        assertEquals(NO_ENCONTRADO, registrar(cliente, "no-existe", Map.of("unidad", "A-01", "tipo", 1)));
        assertEquals(ACEPTADA, registrar(cliente, id, Map.of("unidad", "A-01", "tipo", 2)));
        assertEquals(CONFLICTO, registrar(cliente, id, Map.of("unidad", "A-01", "tipo", 3)));
        detener(cliente, id);
    }

    @Test
    void registrarAveria_ejecucionSinIniciarOHastaElColapso_responde409() {
        RestClient cliente = cliente();
        String configurada = crear(cliente, "SIMULACION_PERIODO");
        String colapso = crear(cliente, "COLAPSO_LOGISTICO");
        cliente.post().uri("/api/ejecuciones/{id}/iniciar", colapso).retrieve().toBodilessEntity();

        assertEquals(CONFLICTO, registrar(cliente, configurada, Map.of("unidad", "A-01", "tipo", 1)));
        assertEquals(CONFLICTO, registrar(cliente, colapso, Map.of("unidad", "A-01", "tipo", 1)));
        detener(cliente, configurada);
        detener(cliente, colapso);
    }

    private RestClient cliente() {
        return RestClient.create("http://localhost:" + puerto);
    }

    private static String crear(RestClient cliente, String tipoEscenario) {
        Map<String, Object> cuerpo = new HashMap<>();
        cuerpo.put("tipoEscenario", tipoEscenario);
        cuerpo.put("fechaInicio", "2026-01-01");
        cuerpo.put("dias", 1);
        Map<?, ?> creada = cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo).retrieve().body(Map.class);
        return (String) creada.get("id");
    }

    private static void detener(RestClient cliente, String id) {
        cliente.post().uri("/api/ejecuciones/{id}/detener", id).retrieve().toBodilessEntity();
    }

    private static int registrar(RestClient cliente, String id, Map<String, Object> cuerpo) {
        HttpStatusCode codigo = cliente.post().uri("/api/ejecuciones/{id}/averias", id)
                .contentType(MediaType.APPLICATION_JSON).body(cuerpo)
                .exchange((peticion, respuesta) -> respuesta.getStatusCode());
        return codigo.value();
    }
}
