package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AlmacenEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de la deteccion de alertas (stock bajo y pedido tarde) a partir de la instantanea difundida.
 */
class DetectorAlertasTest {

    private static final long MINUTO_MS = 60_000L;
    private static final long LIMITE_MS = 1_000 * MINUTO_MS;

    private final DetectorAlertas detector = new DetectorAlertas();

    @Test
    void almacenesQueEntranEnRojo_avisaUnaVezPorEntrada() {
        assertTrue(detector.almacenesQueEntranEnRojo(List.of(almacen(1, "VERDE", 90))).isEmpty());

        assertEquals(1, detector.almacenesQueEntranEnRojo(List.of(almacen(1, "ROJO", 8))).size());
        // Sigue en rojo: no repite.
        assertTrue(detector.almacenesQueEntranEnRojo(List.of(almacen(1, "ROJO", 5))).isEmpty());
        assertTrue(detector.almacenesQueEntranEnRojo(List.of(almacen(1, "ROJO", 2))).isEmpty());
    }

    @Test
    void almacenesQueEntranEnRojo_alSalirDeRojoSeRearma() {
        detector.almacenesQueEntranEnRojo(List.of(almacen(1, "ROJO", 8)));

        assertTrue(detector.almacenesQueEntranEnRojo(List.of(almacen(1, "AMBAR", 20))).isEmpty());

        List<AlmacenEnMapa> nuevos = detector.almacenesQueEntranEnRojo(List.of(almacen(1, "ROJO", 9)));
        assertEquals(1, nuevos.size());
        assertEquals(1, nuevos.get(0).id());
    }

    @Test
    void almacenesQueEntranEnRojo_seguimientoIndependientePorAlmacen() {
        detector.almacenesQueEntranEnRojo(List.of(almacen(1, "ROJO", 8), almacen(2, "VERDE", 90)));

        List<AlmacenEnMapa> nuevos = detector.almacenesQueEntranEnRojo(
                List.of(almacen(1, "ROJO", 7), almacen(2, "ROJO", 9)));

        assertEquals(List.of(2), nuevos.stream().map(AlmacenEnMapa::id).toList());
    }

    @Test
    void almacenesQueEntranEnRojo_ignoraElAlmacenIlimitado() {
        AlmacenEnMapa central = new AlmacenEnMapa(0, "CENTRAL", "Central", new Coordenada(0, 0), null, null, true,
                null);

        assertTrue(detector.almacenesQueEntranEnRojo(List.of(central)).isEmpty());
    }

    @Test
    void pedidosQueLlegaranTarde_avisaUnaVezPorPedido() {
        assertTrue(detector.pedidosQueLlegaranTarde(List.of(pedido(1, "EN_TRANSITO", LIMITE_MS - MINUTO_MS)))
                .isEmpty());

        assertEquals(1, detector.pedidosQueLlegaranTarde(
                List.of(pedido(1, "EN_TRANSITO", LIMITE_MS + 67 * MINUTO_MS))).size());
        assertTrue(detector.pedidosQueLlegaranTarde(
                List.of(pedido(1, "EN_TRANSITO", LIMITE_MS + 80 * MINUTO_MS))).isEmpty());
    }

    @Test
    void pedidosQueLlegaranTarde_unPedidoYaAvisadoNoVuelveAAvisarAunqueSeNormalice() {
        detector.pedidosQueLlegaranTarde(List.of(pedido(1, "EN_TRANSITO", LIMITE_MS + MINUTO_MS)));
        detector.pedidosQueLlegaranTarde(List.of(pedido(1, "EN_TRANSITO", LIMITE_MS - MINUTO_MS)));

        assertTrue(detector.pedidosQueLlegaranTarde(List.of(pedido(1, "EN_TRANSITO", LIMITE_MS + MINUTO_MS)))
                .isEmpty());
    }

    @Test
    void pedidosQueLlegaranTarde_sinEstimacionOEntregado_noAvisa() {
        assertTrue(detector.pedidosQueLlegaranTarde(List.of(pedido(1, "REGISTRADO", null))).isEmpty());
        assertTrue(detector.pedidosQueLlegaranTarde(
                List.of(pedido(2, "ENTREGADO", LIMITE_MS + MINUTO_MS))).isEmpty());
    }

    @Test
    void pedidosQueLlegaranTarde_llegadaJustoEnElLimite_noEsTarde() {
        assertTrue(detector.pedidosQueLlegaranTarde(List.of(pedido(1, "EN_TRANSITO", LIMITE_MS))).isEmpty());
    }

    @Test
    void minutosTarde_esLaDiferenciaEntreLlegadaYLimite() {
        assertEquals(67, DetectorAlertas.minutosTarde(pedido(1, "EN_TRANSITO", LIMITE_MS + 67 * MINUTO_MS)));
    }

    @Test
    void minutosTarde_redondeaHaciaArribaYNuncaEsCero() {
        assertEquals(1, DetectorAlertas.minutosTarde(pedido(1, "EN_TRANSITO", LIMITE_MS + 30_000)));
        assertEquals(1, DetectorAlertas.minutosTarde(pedido(1, "EN_TRANSITO", LIMITE_MS + 1)));
        assertEquals(68, DetectorAlertas.minutosTarde(pedido(1, "EN_TRANSITO", LIMITE_MS + 67 * MINUTO_MS + 1_000)));
    }

    @Test
    void formatearDuracion_enEspanolLegible() {
        assertEquals("38 min", DetectorAlertas.formatearDuracion(38));
        assertEquals("1 h 07 min", DetectorAlertas.formatearDuracion(67));
        assertEquals("2 h 00 min", DetectorAlertas.formatearDuracion(120));
        assertEquals("1 min", DetectorAlertas.formatearDuracion(1));
    }

    @Test
    void porcentajeDeStock_redondeaSobreLaCapacidad() {
        assertEquals(8, DetectorAlertas.porcentajeStock(almacen(1, "ROJO", 8)));
        assertEquals(13, DetectorAlertas.porcentajeStock(new AlmacenEnMapa(1, "INTERMEDIO_1", "Almacén",
                new Coordenada(1, 1), 600, 77, false, "ROJO")));
    }

    private static AlmacenEnMapa almacen(int id, String nivel, int stock) {
        return new AlmacenEnMapa(id, "INTERMEDIO_" + id, "Almacén " + id, new Coordenada(10, 10), 100, stock, false,
                nivel);
    }

    private static PedidoEnMapa pedido(int id, String estado, Long etaMs) {
        return new PedidoEnMapa(id, "PED-" + id, new Coordenada(5, 5), 3, 0, LIMITE_MS, etaMs, estado, "VERDE", null,
                null, null, List.of());
    }
}
