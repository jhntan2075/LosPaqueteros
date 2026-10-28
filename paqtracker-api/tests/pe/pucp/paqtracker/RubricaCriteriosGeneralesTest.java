package pe.pucp.paqtracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Rubrica c.1inf54.26-2, criterios generales antes de los escenarios: Ta, Sa y Sc (6, 7, 8) y carga
 * independiente de los escenarios (22), comprobados de punta a punta contra la API.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RubricaCriteriosGeneralesTest {

    private static final int SA_MINUTOS = 30;
    private static final int SC_SEGUNDOS = 1;
    private static final double K = 180;
    /** Un Sa simulado dura Sa / k en tiempo real: 30 min / 180 = 10 s. Ta debe caber en ese salto. */
    private static final long PRESUPUESTO_TA_MS = (long) (SA_MINUTOS * 60_000 / K);
    private static final long ESPERA_MS = 15_000;

    @LocalServerPort
    private int puerto;

    @Test
    void criterios6a8_parametrosDeLaCorrida_informanSaScYK() {
        RestClient cliente = cliente();
        Map<?, ?> creada = crear(cliente, "SIMULACION_PERIODO", "2026-01-01", null);
        Map<?, ?> parametros = (Map<?, ?>) creada.get("parametros");

        assertEquals(SA_MINUTOS, ((Number) parametros.get("saltoAlgoritmoSaMinutos")).intValue());
        assertEquals(SC_SEGUNDOS, ((Number) parametros.get("saltoConsumoScSegundos")).intValue());
        assertEquals(K, ((Number) parametros.get("factorAceleracionK")).doubleValue());
        detener(cliente, (String) creada.get("id"));
    }

    @Test
    void criterio6_ta_seMideEnCadaPlanificacionYCabeEnElSaltoSa() throws InterruptedException {
        RestClient cliente = cliente();
        String id = (String) crear(cliente, "SIMULACION_PERIODO", "2026-01-01", null).get("id");
        cliente.post().uri("/api/ejecuciones/{id}/iniciar", id).retrieve().toBodilessEntity();

        Map<?, ?> indicadores = esperarPlanificacion(cliente, id);

        long ta = ((Number) indicadores.get("tiempoComputoUltimoTaMs")).longValue();
        assertTrue(ta >= 0, "Ta negativo: " + ta);
        assertTrue(ta < PRESUPUESTO_TA_MS, "Ta = " + ta + " ms no cabe en un Sa real de " + PRESUPUESTO_TA_MS + " ms");
        detener(cliente, id);
    }

    @Test
    void criterio22_escenarios_seCarganYCorrenDeFormaIndependiente() {
        RestClient cliente = cliente();
        String periodo = (String) crear(cliente, "SIMULACION_PERIODO", "2026-01-01",
                Map.of("autos", 2, "motos", 2, "bicicletas", 2)).get("id");
        String colapso = (String) crear(cliente, "COLAPSO_LOGISTICO", "2026-01-01", null).get("id");
        assertNotEquals(periodo, colapso);

        // Cada ejecucion tiene su propia flota y su propio estado.
        assertEquals(6, ((List<?>) estado(cliente, periodo).get("unidades")).size());
        assertEquals(37, ((List<?>) estado(cliente, colapso).get("unidades")).size());

        cliente.post().uri("/api/ejecuciones/{id}/iniciar", periodo).retrieve().toBodilessEntity();
        assertEquals("EN_CURSO", estado(cliente, periodo).get("estado"));
        assertEquals("CONFIGURADA", estado(cliente, colapso).get("estado"));

        detener(cliente, periodo);
        assertEquals("FINALIZADA", estado(cliente, periodo).get("estado"));
        assertEquals("CONFIGURADA", estado(cliente, colapso).get("estado"));
        detener(cliente, colapso);
    }

    private Map<?, ?> esperarPlanificacion(RestClient cliente, String id) throws InterruptedException {
        long limite = System.currentTimeMillis() + ESPERA_MS;
        while (System.currentTimeMillis() < limite) {
            Map<?, ?> indicadores = (Map<?, ?>) estado(cliente, id).get("indicadores");
            if (indicadores != null && ((Number) indicadores.get("replanificaciones")).intValue() > 0) {
                return indicadores;
            }
            TimeUnit.MILLISECONDS.sleep(200);
        }
        throw new AssertionError("No hubo ninguna planificacion en " + ESPERA_MS + " ms");
    }

    private RestClient cliente() {
        return RestClient.create("http://localhost:" + puerto);
    }

    private static Map<?, ?> crear(RestClient cliente, String escenario, String fecha, Map<String, Integer> flota) {
        Map<String, Object> cuerpo = new HashMap<>(Map.of("tipoEscenario", escenario, "fechaInicio", fecha));
        if ("SIMULACION_PERIODO".equals(escenario)) {
            cuerpo.put("dias", 1);
        }
        if (flota != null) {
            cuerpo.put("flota", flota);
        }
        Map<?, ?> creada = cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON).body(cuerpo)
                .retrieve().body(Map.class);
        assertNotNull(creada);
        return creada;
    }

    private static Map<?, ?> estado(RestClient cliente, String id) {
        return cliente.get().uri("/api/ejecuciones/{id}/estado", id).retrieve().body(Map.class);
    }

    private static void detener(RestClient cliente, String id) {
        cliente.post().uri("/api/ejecuciones/{id}/detener", id).retrieve().toBodilessEntity();
    }
}
