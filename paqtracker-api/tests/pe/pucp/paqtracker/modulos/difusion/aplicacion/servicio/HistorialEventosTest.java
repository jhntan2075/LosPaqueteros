package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas del historial de eventos por ejecucion: orden, cubetas acotadas y acceso concurrente.
 */
class HistorialEventosTest {

    private static final String EJECUCION = "ejec-1";

    private final HistorialEventos historial = new HistorialEventos();

    @Test
    void consultar_ejecucionDesconocida_devuelveVacio() {
        assertTrue(historial.consultar("no-existe", 800).isEmpty());
    }

    @Test
    void consultar_ordenaPorInstanteSimuladoDescendente() {
        historial.registrar(evento("a", "NUEVO_PEDIDO", 1_000));
        historial.registrar(evento("b", "UNIDAD_AVERIADA", 3_000));
        historial.registrar(evento("c", "PLAN_ACTUALIZADO", 2_000));

        assertEquals(List.of("b", "c", "a"), ids(historial.consultar(EJECUCION, 800)));
    }

    @Test
    void consultar_mismoInstante_elUltimoRegistradoPrimero() {
        historial.registrar(evento("a", "NUEVO_PEDIDO", 5_000));
        historial.registrar(evento("b", "STOCK_BAJO", 5_000));
        historial.registrar(evento("c", "PLAN_ACTUALIZADO", 5_000));

        assertEquals(List.of("c", "b", "a"), ids(historial.consultar(EJECUCION, 800)));
    }

    @Test
    void consultar_ejecucionesDistintas_noSeMezclan() {
        historial.registrar(evento("a", "NUEVO_PEDIDO", 1));
        historial.registrar(new MensajeEventoEjecucion("x", "otra", "NUEVO_PEDIDO", "m", 2, Map.of()));

        assertEquals(List.of("a"), ids(historial.consultar(EJECUCION, 800)));
        assertEquals(List.of("x"), ids(historial.consultar("otra", 800)));
    }

    @Test
    void registrar_importantes_descartaLosMasAntiguosAlPasarDe500() {
        for (int i = 0; i < 520; i++) {
            historial.registrar(evento("i" + i, "ALERTA_COLAPSO", i));
        }

        List<MensajeEventoEjecucion> eventos = historial.consultar(EJECUCION, 800);

        assertEquals(500, eventos.size());
        assertEquals("i519", eventos.get(0).id());
        assertEquals("i20", eventos.get(499).id());
    }

    @Test
    void registrar_rutina_descartaLosMasAntiguosAlPasarDe300() {
        for (int i = 0; i < 350; i++) {
            historial.registrar(evento("r" + i, "NUEVO_PEDIDO", i));
        }

        List<MensajeEventoEjecucion> eventos = historial.consultar(EJECUCION, 800);

        assertEquals(300, eventos.size());
        assertEquals("r349", eventos.get(0).id());
        assertEquals("r50", eventos.get(299).id());
    }

    @Test
    void registrar_rutinaEnExceso_noDesplazaAlosImportantes() {
        historial.registrar(evento("grave", "UNIDAD_AVERIADA", 0));
        for (int i = 0; i < 1_000; i++) {
            historial.registrar(evento("r" + i, "PEDIDO_ENTREGADO", 10 + i));
        }

        List<MensajeEventoEjecucion> eventos = historial.consultar(EJECUCION, 800);

        assertEquals(301, eventos.size());
        assertEquals("grave", eventos.get(300).id());
    }

    @Test
    void consultar_limite_recortaAlosMasRecientes() {
        for (int i = 0; i < 10; i++) {
            historial.registrar(evento("e" + i, "NUEVO_PEDIDO", i));
        }

        assertEquals(List.of("e9", "e8", "e7"), ids(historial.consultar(EJECUCION, 3)));
    }

    @Test
    void consultar_limiteMayorAlMaximo_seAcotaA800() {
        for (int i = 0; i < 600; i++) {
            historial.registrar(evento("i" + i, "TRASBORDO", i));
            historial.registrar(evento("r" + i, "NUEVO_PEDIDO", i));
        }

        assertEquals(800, historial.consultar(EJECUCION, 5_000).size());
    }

    @Test
    void olvidar_liberaElHistorialDeLaEjecucion() {
        historial.registrar(evento("a", "NUEVO_PEDIDO", 1));

        historial.olvidar(EJECUCION);

        assertTrue(historial.consultar(EJECUCION, 800).isEmpty());
    }

    @Test
    void registrar_desdeVariosHilos_respetaLasCapacidadesSinPerderConsistencia() throws Exception {
        int hilos = 8;
        ExecutorService ejecutor = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(hilos);
        for (int h = 0; h < hilos; h++) {
            int hilo = h;
            ejecutor.submit(() -> {
                try {
                    salida.await();
                    for (int i = 0; i < 400; i++) {
                        historial.registrar(evento("h" + hilo + "-" + i,
                                i % 2 == 0 ? "ALERTA_COLAPSO" : "NUEVO_PEDIDO", i));
                        historial.consultar(EJECUCION, 800);
                    }
                } catch (InterruptedException excepcion) {
                    Thread.currentThread().interrupt();
                } finally {
                    terminados.countDown();
                }
            });
        }
        salida.countDown();
        assertTrue(terminados.await(30, TimeUnit.SECONDS));
        ejecutor.shutdown();

        List<MensajeEventoEjecucion> eventos = historial.consultar(EJECUCION, 800);

        assertEquals(800, eventos.size());
        assertEquals(800, eventos.stream().map(MensajeEventoEjecucion::id).distinct().count());
        assertEquals(500, eventos.stream().filter(e -> e.tipo().equals("ALERTA_COLAPSO")).count());
        assertEquals(300, eventos.stream().filter(e -> e.tipo().equals("NUEVO_PEDIDO")).count());
    }

    private static MensajeEventoEjecucion evento(String id, String tipo, long instanteMs) {
        return new MensajeEventoEjecucion(id, EJECUCION, tipo, "mensaje " + id, instanteMs, Map.of());
    }

    private static List<String> ids(List<MensajeEventoEjecucion> eventos) {
        return eventos.stream().map(MensajeEventoEjecucion::id).toList();
    }
}
