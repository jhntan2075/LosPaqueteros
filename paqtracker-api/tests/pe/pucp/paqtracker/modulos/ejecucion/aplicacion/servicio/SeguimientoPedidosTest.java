package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.IndicadoresOperacion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.FabricaAlgoritmo;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.ServicioPlanificacion;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.soporte.PropiedadesPrueba;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas del seguimiento de pedidos: estados a partir de los pasos y nivel del semaforo.
 */
class SeguimientoPedidosTest {

    private static final LineaTiempo LINEA = new LineaTiempo(ZonedDateTime.of(2026, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC));
    private static final PropiedadesDominio.Semaforo SEMAFORO = PropiedadesPrueba.crear().semaforo();
    private static final int SA = 30;

    @Test
    void aplicar_simulacionCompleta_todosLosPedidosQuedanEntregados() {
        List<Pedido> pedidos = List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160),
                new Pedido(2, new Nodo(50, 25), 2, 60, 2160));
        SimulacionEnCurso simulacion = simulacion(pedidos);
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO,
                CodigosFlota.de(simulacion.getFlota()), 10);

        for (int instante = 0; instante <= 1440; instante += SA) {
            seguimiento.aplicar(simulacion.avanzar(instante));
        }

        IndicadoresOperacion indicadores = seguimiento.indicadores(simulacion, 1440);
        assertEquals(2, indicadores.pedidosRegistrados());
        assertEquals(2, indicadores.pedidosEntregadosATiempo());
        assertEquals(0, indicadores.pedidosPendientes());
        assertEquals(100.0, indicadores.porcentajeCumplimiento());
        assertEquals(0, seguimiento.pedidosActivos(1440).size());
    }

    @Test
    void pedidosActivos_pedidoEnEsperaConPocaHolgura_quedaEnRojo() {
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO, CodigosFlota.de(List.of()), 10);
        seguimiento.registrar(new Pedido(1, new Nodo(30, 18), 3, 0, 100));

        assertEquals("VERDE", seguimiento.pedidosActivos(10).get(0).nivelHolgura());
        assertEquals("AMBAR", seguimiento.pedidosActivos(70).get(0).nivelHolgura());
        assertEquals("ROJO", seguimiento.pedidosActivos(90).get(0).nivelHolgura());
    }

    @Test
    void reservarId_variasVeces_entregaIdsConsecutivosDesdeElPrimeroLibre() {
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO, CodigosFlota.de(List.of()), 10);

        assertEquals(10, seguimiento.reservarId());
        assertEquals(11, seguimiento.reservarId());
    }

    private static SimulacionEnCurso simulacion(List<Pedido> pedidos) {
        return new ServicioPlanificacion(new FabricaAlgoritmo()).prepararSimulacion(
                new SolicitudPreparacionSimulacion(pedidos, List.of(), AlgoritmoPlanificacion.GA, 1L, SA, false,
                        ComposicionFlota.porDefecto()));
    }
}
