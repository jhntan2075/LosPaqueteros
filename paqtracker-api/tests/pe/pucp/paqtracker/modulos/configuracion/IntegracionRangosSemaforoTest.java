package pe.pucp.paqtracker.modulos.configuracion;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RepositorioRangosSemaforo;
import java.util.HashMap;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Prueba por HTTP de {@code GET} y {@code PUT /api/configuracion/semaforo}: valores por defecto, cambio
 * guardado en la base y codigos de error. Cada prueba deja los rangos por defecto, porque el contexto de
 * Spring y la base H2 se comparten entre clases de prueba.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IntegracionRangosSemaforoTest {

    private static final int OK = 200;
    private static final int SOLICITUD_INVALIDA = 400;
    private static final String RUTA = "/api/configuracion/semaforo";

    @LocalServerPort
    private int puerto;

    @Autowired
    private RepositorioRangosSemaforo repositorio;

    @AfterEach
    void restaurar() {
        assertEquals(OK, actualizar(porDefecto()));
    }

    @Test
    void consultar_sinCambios_devuelveLosValoresQueRegianAntes() {
        Map<?, ?> rangos = cliente().get().uri(RUTA).retrieve().body(Map.class);

        assertEquals(Map.of("rojo", 0.15, "ambar", 0.40), rangos.get("holgura"));
        assertEquals(Map.of("rojo", 0.20, "ambar", 0.50), rangos.get("inventario"));
        assertEquals(Map.of("vacio", 0.0, "ambar", 0.70, "rojo", 0.90), rangos.get("ocupacionUnidad"));
        assertEquals(Map.of("vacio", 0.0, "ambar", 0.50, "rojo", 0.80), rangos.get("ocupacionAlmacen"));
    }

    @Test
    void actualizar_rangosValidos_quedanGuardadosEnLaBaseYSeConsultan() {
        Map<String, Object> cuerpo = porDefecto();
        cuerpo.put("holgura", Map.of("rojo", 0.10, "ambar", 0.30));
        cuerpo.put("ocupacionUnidad", Map.of("vacio", 0.05, "ambar", 0.60, "rojo", 0.85));

        assertEquals(OK, actualizar(cuerpo));

        Map<?, ?> rangos = cliente().get().uri(RUTA).retrieve().body(Map.class);
        assertEquals(Map.of("rojo", 0.10, "ambar", 0.30), rangos.get("holgura"));
        RangosSemaforo guardados = repositorio.buscar().orElseThrow();
        assertEquals(new RangosSemaforo.CortesPorDebajo(0.10, 0.30), guardados.holgura());
        assertEquals(new RangosSemaforo.CortesCarga(0.05, 0.60, 0.85), guardados.ocupacionUnidad());
    }

    @Test
    void actualizar_umbralesFueraDeOrden_respondeSolicitudInvalidaYNoCambiaNada() {
        Map<String, Object> cuerpo = porDefecto();
        cuerpo.put("inventario", Map.of("rojo", 0.60, "ambar", 0.50));

        assertEquals(SOLICITUD_INVALIDA, actualizar(cuerpo));
        assertEquals(new RangosSemaforo.CortesPorDebajo(0.20, 0.50), repositorio.buscar().orElseThrow().inventario());
    }

    @Test
    void actualizar_vacioNoMenorQueAmbar_respondeSolicitudInvalida() {
        Map<String, Object> cuerpo = porDefecto();
        cuerpo.put("ocupacionAlmacen", Map.of("vacio", 0.50, "ambar", 0.50, "rojo", 0.80));

        assertEquals(SOLICITUD_INVALIDA, actualizar(cuerpo));
    }

    @Test
    void actualizar_valorFueraDeRango_respondeSolicitudInvalida() {
        Map<String, Object> cuerpo = porDefecto();
        cuerpo.put("ocupacionUnidad", Map.of("vacio", 0.0, "ambar", 0.70, "rojo", 1.5));

        assertEquals(SOLICITUD_INVALIDA, actualizar(cuerpo));
    }

    @Test
    void actualizar_campoFaltanteONoNumerico_respondeSolicitudInvalida() {
        Map<String, Object> sinAmbar = porDefecto();
        sinAmbar.put("holgura", Map.of("rojo", 0.15));
        Map<String, Object> sinGrupo = porDefecto();
        sinGrupo.remove("inventario");
        Map<String, Object> texto = porDefecto();
        texto.put("holgura", Map.of("rojo", "mucho", "ambar", 0.40));

        assertEquals(SOLICITUD_INVALIDA, actualizar(sinAmbar));
        assertEquals(SOLICITUD_INVALIDA, actualizar(sinGrupo));
        assertEquals(SOLICITUD_INVALIDA, actualizar(texto));
    }

    private static Map<String, Object> porDefecto() {
        Map<String, Object> cuerpo = new HashMap<>();
        cuerpo.put("holgura", Map.of("rojo", 0.15, "ambar", 0.40));
        cuerpo.put("inventario", Map.of("rojo", 0.20, "ambar", 0.50));
        cuerpo.put("ocupacionUnidad", Map.of("vacio", 0.0, "ambar", 0.70, "rojo", 0.90));
        cuerpo.put("ocupacionAlmacen", Map.of("vacio", 0.0, "ambar", 0.50, "rojo", 0.80));
        return cuerpo;
    }

    private int actualizar(Map<String, Object> cuerpo) {
        HttpStatusCode codigo = cliente().put().uri(RUTA).contentType(MediaType.APPLICATION_JSON).body(cuerpo)
                .exchange((peticion, respuesta) -> respuesta.getStatusCode());
        return codigo.value();
    }

    private RestClient cliente() {
        return RestClient.create("http://localhost:" + puerto);
    }
}
