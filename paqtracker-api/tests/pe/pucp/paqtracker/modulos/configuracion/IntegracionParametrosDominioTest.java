package pe.pucp.paqtracker.modulos.configuracion;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import pe.pucp.paqtracker.modelo.ParametrosDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RepositorioParametrosDominio;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Prueba por HTTP de {@code GET}, {@code PUT} y {@code DELETE /api/configuracion/parametros} (B02, B04,
 * B07-B09): valores por defecto, cambio guardado en la base, efecto en las ejecuciones nuevas y codigos de
 * error. Cada prueba deja los valores por defecto, porque el contexto y la base H2 se comparten.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IntegracionParametrosDominioTest {

    private static final int OK = 200;
    private static final int SOLICITUD_INVALIDA = 400;
    private static final String RUTA = "/api/configuracion/parametros";
    private static final long MINUTO_MS = 60_000L;

    @LocalServerPort
    private int puerto;

    @Autowired
    private RepositorioParametrosDominio repositorio;

    @AfterEach
    void restaurar() {
        cliente().delete().uri(RUTA).retrieve().toBodilessEntity();
    }

    @Test
    void consultar_sinCambios_devuelveLosValoresDelDominio() {
        Map<?, ?> parametros = cliente().get().uri(RUTA).retrieve().body(Map.class);

        List<?> almacenes = (List<?>) parametros.get("almacenes");
        assertEquals(3, almacenes.size());
        Map<?, ?> central = (Map<?, ?>) almacenes.get(0);
        assertEquals("CENTRAL", central.get("codigo"));
        assertEquals(27, central.get("x"));
        assertEquals(14, central.get("y"));
        assertEquals(1000, ((Map<?, ?>) almacenes.get(1)).get("capacidad"));
        Map<?, ?> auto = (Map<?, ?>) ((List<?>) parametros.get("unidades")).get(0);
        assertEquals("AUTO", auto.get("tipo"));
        assertEquals(24, auto.get("capacidad"));
        assertEquals(120, ((Map<?, ?>) parametros.get("averias")).get("tipo1Minutos"));
    }

    @Test
    void actualizar_valoresValidos_seGuardanYSeVenEnElDominio() {
        Map<String, Object> cuerpo = porDefecto();
        almacen(cuerpo, 1).put("x", 15);
        almacen(cuerpo, 1).put("capacidad", 800);
        unidad(cuerpo, 0).put("capacidad", 30);

        assertEquals(OK, actualizar(cuerpo));

        ParametrosDominio guardados = repositorio.buscar().orElseThrow();
        assertEquals(15, guardados.almacenes().get(1).x());
        assertEquals(800, guardados.almacenes().get(1).capacidad());
        assertEquals(30, guardados.unidad(TipoVehiculo.AUTO).capacidad());
        Map<?, ?> dominio = cliente().get().uri("/api/configuracion/dominio").retrieve().body(Map.class);
        Map<?, ?> intermedio = (Map<?, ?>) ((List<?>) dominio.get("almacenes")).get(1);
        assertEquals(15.0, ((Number) ((Map<?, ?>) intermedio.get("ubicacion")).get("x")).doubleValue());
        assertEquals(30, ((Map<?, ?>) ((List<?>) dominio.get("tiposUnidad")).get(0)).get("capacidad"));
    }

    @Test
    void actualizar_duracionDeAveria_rigeEnLasEjecucionesNuevas() {
        Map<String, Object> cuerpo = porDefecto();
        averias(cuerpo).put("tipo1Minutos", 90);
        assertEquals(OK, actualizar(cuerpo));
        RestClient cliente = cliente();
        String id = crearEjecucion(cliente);
        cliente.post().uri("/api/ejecuciones/{id}/iniciar", id).retrieve().toBodilessEntity();

        List<?> estimaciones = cliente.get().uri("/api/ejecuciones/{id}/averias/estimacion", id).retrieve()
                .body(List.class);

        Map<?, ?> tipo1 = (Map<?, ?>) estimaciones.get(0);
        long duracion = ((Number) tipo1.get("reincorporacionMs")).longValue()
                - ((Number) tipo1.get("instanteMs")).longValue();
        assertEquals(90 * MINUTO_MS, duracion);
        cliente.post().uri("/api/ejecuciones/{id}/detener", id).retrieve().toBodilessEntity();
    }

    @Test
    void actualizar_valoresIncoherentes_respondeSolicitudInvalidaYNoCambiaNada() {
        Map<String, Object> repetido = porDefecto();
        almacen(repetido, 2).put("x", 27);
        almacen(repetido, 2).put("y", 14);
        Map<String, Object> fueraDeMalla = porDefecto();
        almacen(fueraDeMalla, 0).put("x", 90);
        Map<String, Object> sinVelocidad = porDefecto();
        unidad(sinVelocidad, 2).put("velocidadKmH", 0);
        Map<String, Object> trasvaseLargo = porDefecto();
        averias(trasvaseLargo).put("trasvaseMinutos", 500);

        assertEquals(SOLICITUD_INVALIDA, actualizar(repetido));
        assertEquals(SOLICITUD_INVALIDA, actualizar(fueraDeMalla));
        assertEquals(SOLICITUD_INVALIDA, actualizar(sinVelocidad));
        assertEquals(SOLICITUD_INVALIDA, actualizar(trasvaseLargo));
        assertTrue(repositorio.buscar().isEmpty());
    }

    @Test
    void restablecer_trasUnCambio_vuelveALosValoresPorDefecto() {
        Map<String, Object> cuerpo = porDefecto();
        unidad(cuerpo, 1).put("velocidadKmH", 50);
        assertEquals(OK, actualizar(cuerpo));

        Map<?, ?> restablecidos = cliente().delete().uri(RUTA).retrieve().body(Map.class);

        assertEquals(25, ((Map<?, ?>) ((List<?>) restablecidos.get("unidades")).get(1)).get("velocidadKmH"));
        assertTrue(repositorio.buscar().isEmpty());
    }

    @Test
    void reiniciarDiaADia_creaLaOperacionConLosParametrosVigentes() {
        Map<String, Object> cuerpo = porDefecto();
        averias(cuerpo).put("tipo1Minutos", 60);
        assertEquals(OK, actualizar(cuerpo));
        RestClient cliente = cliente();

        Map<?, ?> primera = cliente.post().uri("/api/ejecuciones/dia-a-dia/reiniciar").retrieve().body(Map.class);
        Map<?, ?> segunda = cliente.post().uri("/api/ejecuciones/dia-a-dia/reiniciar").retrieve().body(Map.class);

        assertEquals("dia-a-dia", primera.get("id"));
        assertEquals("dia-a-dia", segunda.get("id"));
        Map<?, ?> tipo1 = (Map<?, ?>) cliente.get().uri("/api/ejecuciones/dia-a-dia/averias/estimacion").retrieve()
                .body(List.class).get(0);
        assertEquals(60 * MINUTO_MS, ((Number) tipo1.get("reincorporacionMs")).longValue()
                - ((Number) tipo1.get("instanteMs")).longValue());
        cliente.post().uri("/api/ejecuciones/dia-a-dia/detener").retrieve().toBodilessEntity();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> almacen(Map<String, Object> cuerpo, int indice) {
        return ((List<Map<String, Object>>) cuerpo.get("almacenes")).get(indice);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> unidad(Map<String, Object> cuerpo, int indice) {
        return ((List<Map<String, Object>>) cuerpo.get("unidades")).get(indice);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> averias(Map<String, Object> cuerpo) {
        return (Map<String, Object>) cuerpo.get("averias");
    }

    private Map<String, Object> porDefecto() {
        Map<String, Object> cuerpo = new HashMap<>();
        cuerpo.put("almacenes", List.of(
                new HashMap<>(Map.of("codigo", "CENTRAL", "x", 27, "y", 14)),
                new HashMap<>(Map.of("codigo", "INTERMEDIO_1", "x", 12, "y", 38, "capacidad", 1000)),
                new HashMap<>(Map.of("codigo", "INTERMEDIO_2", "x", 57, "y", 27, "capacidad", 1000))));
        cuerpo.put("unidades", List.of(
                new HashMap<>(Map.of("tipo", "AUTO", "capacidad", 24, "velocidadKmH", 40, "costoPorKm", 1.2)),
                new HashMap<>(Map.of("tipo", "MOTO", "capacidad", 8, "velocidadKmH", 25, "costoPorKm", 0.6)),
                new HashMap<>(Map.of("tipo", "BICICLETA", "capacidad", 4, "velocidadKmH", 12, "costoPorKm", 0.15))));
        cuerpo.put("averias", new HashMap<>(Map.of("tipo1Minutos", 120, "permanenciaSitioMinutos", 240,
                "tipo3MinimoMinutos", 2880, "trasvaseMinutos", 30)));
        return cuerpo;
    }

    private int actualizar(Map<String, Object> cuerpo) {
        HttpStatusCode codigo = cliente().put().uri(RUTA).contentType(MediaType.APPLICATION_JSON).body(cuerpo)
                .exchange((peticion, respuesta) -> respuesta.getStatusCode());
        return codigo.value();
    }

    private static String crearEjecucion(RestClient cliente) {
        Map<String, Object> cuerpo = new HashMap<>();
        cuerpo.put("tipoEscenario", "SIMULACION_PERIODO");
        cuerpo.put("fechaInicio", "2026-01-01");
        cuerpo.put("dias", 1);
        Map<?, ?> creada = cliente.post().uri("/api/ejecuciones").contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo).retrieve().body(Map.class);
        return (String) creada.get("id");
    }

    private RestClient cliente() {
        return RestClient.create("http://localhost:" + puerto);
    }
}
