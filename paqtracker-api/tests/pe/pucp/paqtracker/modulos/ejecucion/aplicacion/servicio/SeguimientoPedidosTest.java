package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteRangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Averia;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.TipoAveria;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.FraccionEnvio;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.IndicadoresOperacion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DetallePedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.HitoPedido;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.FabricaAlgoritmo;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.ServicioPlanificacion;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import pe.pucp.paqtracker.simulacion.ResultadoPaso;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.soporte.PropiedadesPrueba;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoAvance;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas del seguimiento de pedidos: estados a partir de los pasos y nivel del semaforo.
 */
class SeguimientoPedidosTest {

    private static final LineaTiempo LINEA = new LineaTiempo(ZonedDateTime.of(2026, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC));
    private static final FuenteRangosSemaforo SEMAFORO = PropiedadesPrueba.rangosSemaforo();
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
    void tomarCambios_pedidoEntregado_informaSuAvanceUnaSolaVezConLoEntregadoAntes() {
        List<Pedido> pedidos = List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160));
        SimulacionEnCurso simulacion = simulacion(pedidos);
        // Antes de un reinicio ya se habian entregado 2 paquetes de este pedido.
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO,
                CodigosFlota.de(simulacion.getFlota()), 10, Map.of(1, 2));

        List<AvancePedido> avances = new ArrayList<>();
        for (int instante = 0; instante <= 1440; instante += SA) {
            seguimiento.aplicar(simulacion.avanzar(instante));
            avances.addAll(seguimiento.tomarCambios());
        }

        AvancePedido ultimo = avances.get(avances.size() - 1);
        assertEquals(EstadoAvance.ENTREGADO, ultimo.estado());
        assertEquals(2 + 3, ultimo.cantidadEntregada());
        assertEquals(0, ultimo.retrasoMinutos());
        assertTrue(avances.stream().anyMatch(avance -> avance.estado() == EstadoAvance.EN_TRANSITO));
        assertTrue(seguimiento.tomarCambios().isEmpty(), "sin cambios nuevos no hay avance que guardar");
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
    void pedidosActivos_rangosCambiadosEnVivo_usaLosNuevosSinRecrearElSeguimiento() {
        AtomicReference<RangosSemaforo> vigentes = new AtomicReference<>(SEMAFORO.vigentes());
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, vigentes::get, CodigosFlota.de(List.of()), 10);
        seguimiento.registrar(new Pedido(1, new Nodo(30, 18), 3, 0, 100));
        assertEquals("AMBAR", seguimiento.pedidosActivos(70).get(0).nivelHolgura());

        RangosSemaforo actuales = vigentes.get();
        vigentes.set(new RangosSemaforo(new RangosSemaforo.CortesPorDebajo(0.10, 0.25), actuales.inventario(),
                actuales.ocupacionUnidad(), actuales.ocupacionAlmacen()));

        assertEquals("VERDE", seguimiento.pedidosActivos(70).get(0).nivelHolgura());
        assertEquals("ROJO", seguimiento.pedidosActivos(95).get(0).nivelHolgura());
    }

    @Test
    void reservarId_variasVeces_entregaIdsConsecutivosDesdeElPrimeroLibre() {
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO, CodigosFlota.de(List.of()), 10);

        assertEquals(10, seguimiento.reservarId());
        assertEquals(11, seguimiento.reservarId());
    }

    @Test
    void aplicar_averiaTipo2ConElPedidoABordo_saleEnUnRespaldoYQuedaEnTransitoEnOtraUnidad() {
        SimulacionEnCurso simulacion = simulacion(List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160)));
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO,
                CodigosFlota.de(simulacion.getFlota()), 10);
        ResultadoPaso salida = simulacion.avanzar(0);
        seguimiento.aplicar(salida);
        int idVehiculo = salida.getUnidadesDespachadas().get(0).getVehiculo().getId();
        simulacion.agregarAveria(new Averia(5, idVehiculo, TipoAveria.TIPO_2));

        seguimiento.aplicar(simulacion.avanzar(5));

        DetallePedido detalle = seguimiento.detalle(1, 5).orElseThrow();
        assertEquals("EN_TRANSITO", detalle.pedido().estado());
        assertEquals(List.of("Registrado", "Despachado", "Respaldo por avería", "Despachado"),
                detalle.hitos().stream().map(HitoPedido::titulo).toList());
        assertEquals(1, seguimiento.indicadores(simulacion, 5).unidadesAveriadas());
    }

    @Test
    void aplicar_averiaConTrasvase_elPedidoPasaALaReceptoraYElDeLaReceptoraSoloSeRetrasa() {
        Pedido urgente = new Pedido(1, new Nodo(30, 18), 3, 0, 60);
        Pedido vecino = new Pedido(2, new Nodo(32, 18), 3, 1, 2160);
        // Solo dos motos: el pedido vecino sale en la otra, que tiene espacio para recibir el urgente.
        SimulacionEnCurso simulacion = simulacion(List.of(urgente, vecino), new ComposicionFlota(0, 2, 0));
        CodigosFlota codigos = CodigosFlota.de(simulacion.getFlota());
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO, codigos, 10);
        ResultadoPaso salida = simulacion.avanzar(0);
        seguimiento.aplicar(salida);
        seguimiento.aplicar(simulacion.avanzar(1));
        int idVehiculo = salida.getUnidadesDespachadas().get(0).getVehiculo().getId();
        simulacion.agregarAveria(new Averia(5, idVehiculo, TipoAveria.TIPO_1));

        ResultadoPaso paso = simulacion.avanzar(5);
        seguimiento.aplicar(paso);

        String receptora = codigos.codigo(paso.getAveriasAplicadas().get(0).trasbordos().get(0).receptora()
                .getVehiculo());
        DetallePedido trasvasado = seguimiento.detalle(1, 5).orElseThrow();
        assertEquals(receptora, trasvasado.pedido().unidad());
        assertEquals("Trasvasado", trasvasado.hitos().get(trasvasado.hitos().size() - 1).titulo());
        DetallePedido propio = seguimiento.detalle(2, 5).orElseThrow();
        assertEquals(receptora, propio.pedido().unidad());
        assertEquals("Desvío por trasvase", propio.hitos().get(propio.hitos().size() - 1).titulo());
    }

    @Test
    void aplicar_averiaTipo1ConElPedidoABordo_retrasaSuLlegadaEstimadaDosHoras() {
        SimulacionEnCurso simulacion = simulacion(List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160)));
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO,
                CodigosFlota.de(simulacion.getFlota()), 10);
        ResultadoPaso salida = simulacion.avanzar(0);
        seguimiento.aplicar(salida);
        long etaOriginal = seguimiento.pedido(1, 0).etaMs();
        int idVehiculo = salida.getUnidadesDespachadas().get(0).getVehiculo().getId();
        simulacion.agregarAveria(new Averia(5, idVehiculo, TipoAveria.TIPO_1));

        seguimiento.aplicar(simulacion.avanzar(5));

        PedidoEnMapa pedido = seguimiento.pedido(1, 5);
        assertEquals("EN_TRANSITO", pedido.estado());
        assertEquals(etaOriginal + Duration.ofMinutes(ConfiguracionDominio.AVERIA_TIPO1_MINUTOS).toMillis(),
                pedido.etaMs());
        assertEquals("Retrasado por avería", seguimiento.detalle(1, 5).orElseThrow().hitos().get(2).titulo());
    }

    @Test
    void aplicar_pedidoDespachado_creaUnaFraccionConSuUnidadSuOrigenYSuSalida() {
        SimulacionEnCurso simulacion = simulacion(List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160)));
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO,
                CodigosFlota.de(simulacion.getFlota()), 10);

        seguimiento.aplicar(simulacion.avanzar(0));

        PedidoEnMapa pedido = seguimiento.pedido(1, 0);
        assertEquals(1, pedido.fracciones().size());
        FraccionEnvio fraccion = pedido.fracciones().get(0);
        assertEquals(1, fraccion.indice());
        assertEquals(pedido.unidad(), fraccion.unidad());
        assertEquals(3, fraccion.cantidad());
        assertNotNull(fraccion.almacenOrigen());
        assertTrue(fraccion.llegadaMs() > fraccion.salidaMs());
        assertNull(pedido.entregaMs());
        int salida = minuto(fraccion.salidaMs());
        assertEquals("EN_CAMINO", seguimiento.pedido(1, salida).fracciones().get(0).estado());
        assertEquals("PROGRAMADA", seguimiento.pedido(1, salida - 0.5).fracciones().get(0).estado());
    }

    @Test
    void aplicar_simulacionCompleta_cadaFraccionQuedaEntregadaConSuHoraReal() {
        SimulacionEnCurso simulacion = simulacion(List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160),
                new Pedido(2, new Nodo(50, 25), 2, 60, 2160)));
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO,
                CodigosFlota.de(simulacion.getFlota()), 10);

        for (int instante = 0; instante <= 1440; instante += SA) {
            seguimiento.aplicar(simulacion.avanzar(instante));
        }

        for (PedidoEnMapa pedido : seguimiento.todos(1440)) {
            assertNotNull(pedido.entregaMs());
            assertTrue(pedido.fracciones().stream().allMatch(f -> "ENTREGADA".equals(f.estado())));
            assertEquals(pedido.cantidad(), pedido.fracciones().stream().mapToInt(FraccionEnvio::cantidad).sum());
            assertEquals(pedido.entregaMs(), pedido.fracciones().stream().mapToLong(FraccionEnvio::llegadaMs).max()
                    .orElseThrow());
        }
    }

    @Test
    void entregadosRecientes_ventanaDeCuatroHoras_incluyeSuBordeYExcluyeLoAnterior() {
        SimulacionEnCurso simulacion = simulacion(List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160)));
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO,
                CodigosFlota.de(simulacion.getFlota()), 10);
        for (int instante = 0; instante <= 1440; instante += SA) {
            seguimiento.aplicar(simulacion.avanzar(instante));
        }
        int entrega = minuto(seguimiento.pedido(1, 1440).entregaMs());

        assertEquals(0, seguimiento.entregadosRecientes(entrega - 1).size());
        assertEquals(1, seguimiento.entregadosRecientes(entrega).size());
        assertEquals(1, seguimiento.entregadosRecientes(entrega + SeguimientoPedidos.VENTANA_RECIENTE_MINUTOS).size());
        assertEquals(0, seguimiento.entregadosRecientes(entrega + SeguimientoPedidos.VENTANA_RECIENTE_MINUTOS + 1)
                .size());
    }

    @Test
    void aplicar_averiaTipo2_laFraccionDeLaAveriadaQuedaLiberadaYSaleOtraEnElRespaldo() {
        SimulacionEnCurso simulacion = simulacion(List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 2160)));
        CodigosFlota codigos = CodigosFlota.de(simulacion.getFlota());
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO, codigos, 10);
        ResultadoPaso salida = simulacion.avanzar(0);
        seguimiento.aplicar(salida);
        String averiada = codigos.codigo(salida.getUnidadesDespachadas().get(0).getVehiculo());
        simulacion.agregarAveria(new Averia(5, salida.getUnidadesDespachadas().get(0).getVehiculo().getId(),
                TipoAveria.TIPO_2));

        seguimiento.aplicar(simulacion.avanzar(5));

        List<FraccionEnvio> fracciones = seguimiento.pedido(1, 5).fracciones();
        assertEquals(2, fracciones.size());
        assertEquals("LIBERADA", fracciones.get(0).estado());
        assertEquals(averiada, fracciones.get(0).unidad());
        assertEquals(2, fracciones.get(1).indice());
        assertNotEquals(averiada, fracciones.get(1).unidad());
        assertNotEquals("LIBERADA", fracciones.get(1).estado());
    }

    @Test
    void aplicar_averiaConTrasvase_laFraccionPasaALaReceptoraConservandoSuCodigo() {
        Pedido urgente = new Pedido(1, new Nodo(30, 18), 3, 0, 60);
        Pedido vecino = new Pedido(2, new Nodo(32, 18), 3, 1, 2160);
        SimulacionEnCurso simulacion = simulacion(List.of(urgente, vecino), new ComposicionFlota(0, 2, 0));
        CodigosFlota codigos = CodigosFlota.de(simulacion.getFlota());
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(LINEA, SEMAFORO, codigos, 10);
        ResultadoPaso salida = simulacion.avanzar(0);
        seguimiento.aplicar(salida);
        seguimiento.aplicar(simulacion.avanzar(1));
        simulacion.agregarAveria(new Averia(5, salida.getUnidadesDespachadas().get(0).getVehiculo().getId(),
                TipoAveria.TIPO_1));

        ResultadoPaso paso = simulacion.avanzar(5);
        seguimiento.aplicar(paso);

        String receptora = codigos.codigo(paso.getAveriasAplicadas().get(0).trasbordos().get(0).receptora()
                .getVehiculo());
        List<FraccionEnvio> fracciones = seguimiento.pedido(1, 5).fracciones();
        assertEquals(1, fracciones.size());
        assertEquals(1, fracciones.get(0).indice());
        assertEquals(receptora, fracciones.get(0).unidad());
    }

    /** Minuto simulado de un instante en milisegundos de la linea de tiempo de prueba. */
    private static int minuto(long instanteMs) {
        return (int) Duration.ofMillis(instanteMs - LINEA.aMilisegundos(0)).toMinutes();
    }

    private static SimulacionEnCurso simulacion(List<Pedido> pedidos) {
        return simulacion(pedidos, ComposicionFlota.porDefecto());
    }

    private static SimulacionEnCurso simulacion(List<Pedido> pedidos, ComposicionFlota flota) {
        return new ServicioPlanificacion(new FabricaAlgoritmo()).prepararSimulacion(
                new SolicitudPreparacionSimulacion(pedidos, List.of(), AlgoritmoPlanificacion.GA, 1L, SA, false,
                        flota));
    }
}
