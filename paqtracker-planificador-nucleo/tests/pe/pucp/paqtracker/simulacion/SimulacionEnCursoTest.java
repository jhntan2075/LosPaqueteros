package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.AlgoritmoMetaheuristico;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.util.Malla;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.LongFunction;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de SimulacionEnCurso: avanzar paso a paso reproduce la simulacion
 * completa y reporta lo ocurrido en cada paso. Semilla fija.
 */
class SimulacionEnCursoTest {

    private static final int SA_MINUTOS = 30;
    private static final long SEMILLA = 7L;
    private static final int PLAZO_REGULAR = 2160;
    private static final int HORIZONTE = 2 * 1440;

    @Test
    void avanzar_pasosDeSa_igualaLaSimulacionCompleta() {
        ResultadoSimulacion completa = crearOrquestador(pedidos()).simular(HORIZONTE, false);

        SimulacionEnCurso simulacion = crearOrquestador(pedidos()).iniciar(false);
        for (int instante = 0; instante <= HORIZONTE; instante += SA_MINUTOS) {
            simulacion.avanzar(instante);
        }
        simulacion.cerrar(HORIZONTE);
        ResultadoSimulacion porPasos = simulacion.getResultado();

        assertEquals(completa.getTotalEntregas(), porPasos.getTotalEntregas());
        assertEquals(completa.getDistanciaTotal(), porPasos.getDistanciaTotal());
        assertEquals(completa.getCostoTotal(), porPasos.getCostoTotal());
        assertEquals(completa.getFitnessAcumulado(), porPasos.getFitnessAcumulado());
        assertEquals(completa.getReplanificaciones(), porPasos.getReplanificaciones());
    }

    @Test
    void avanzar_horizonteCompleto_reportaCadaEntregaUnaSolaVez() {
        List<Pedido> pedidos = pedidos();
        SimulacionEnCurso simulacion = crearOrquestador(pedidos).iniciar(false);
        List<Integer> entregados = new ArrayList<>();

        for (int instante = 0; instante <= HORIZONTE; instante += SA_MINUTOS) {
            simulacion.avanzar(instante).getEntregasCompletadas()
                    .forEach(tramo -> entregados.add(tramo.getIdPedido()));
        }

        Set<Integer> esperados = new HashSet<>();
        pedidos.forEach(pedido -> esperados.add(pedido.getId()));
        assertEquals(pedidos.size(), entregados.size());
        assertEquals(esperados, new HashSet<>(entregados));
    }

    @Test
    void avanzar_pasoConDespacho_reportaUnidadesConTramosHastaQuedarLibres() {
        SimulacionEnCurso simulacion = crearOrquestador(pedidos()).iniciar(false);

        ResultadoPaso paso = simulacion.avanzar(0);

        assertTrue(paso.huboPlanificacion());
        assertFalse(paso.getUnidadesDespachadas().isEmpty());
        for (UnidadEnTransito unidad : paso.getUnidadesDespachadas()) {
            List<Tramo> tramos = unidad.getTramos();
            assertEquals(0, tramos.get(0).getSalida());
            assertEquals(unidad.getLibreEn(), tramos.get(tramos.size() - 1).getLlegada());
            assertTrue(unidad.tramoEnCurso(0).isPresent());
        }
    }

    @Test
    void agregarPedido_registroFuturo_entraALaColaEnSuInstante() {
        SimulacionEnCurso simulacion = crearOrquestador(List.of()).iniciar(false);
        simulacion.avanzar(0);
        Pedido pedido = new Pedido(99, new Nodo(30, 20), 2, 60, PLAZO_REGULAR);

        simulacion.agregarPedido(pedido);

        assertTrue(simulacion.avanzar(30).getPedidosIncorporados().isEmpty());
        assertEquals(List.of(pedido), simulacion.avanzar(60).getPedidosIncorporados());
    }

    @Test
    void avanzar_instanteQueNoAvanza_lanzaExcepcion() {
        SimulacionEnCurso simulacion = crearOrquestador(List.of()).iniciar(false);
        simulacion.avanzar(30);

        assertThrows(IllegalArgumentException.class, () -> simulacion.avanzar(30));
    }

    @Test
    void avanzar_pedidoImposibleConDetencion_declaraColapsoYSeDetiene() {
        // Plazo de un minuto a 40 km del central: ninguna unidad puede llegar a tiempo.
        Pedido imposible = new Pedido(1, new Nodo(67, 14), 2, 0, 1);
        SimulacionEnCurso simulacion = crearOrquestador(List.of(imposible)).iniciar(true);

        ResultadoPaso paso = simulacion.avanzar(0);

        assertTrue(paso.isColapsoDeclarado());
        assertTrue(simulacion.estaDetenida());
        assertThrows(IllegalStateException.class, () -> simulacion.avanzar(SA_MINUTOS));
        ColapsoLogistico colapso = simulacion.getResultado().getColapso().orElseThrow();
        assertEquals(ColapsoLogistico.Causa.ENTREGA_TARDIA, colapso.getCausa());
        assertEquals(1, colapso.getIdPedido());
        assertTrue(colapso.getLlegadaEstimada() > colapso.getHoraLimite());
        assertTrue(colapso.getVehiculo().isPresent());
    }

    @Test
    void avanzar_pedidoQueVenceEnLaColaSinDespacho_declaraColapsoEnSuHoraLimite() {
        // Plazo mayor al de despacho directo y un planificador que no rutea nada: el pedido queda varado en la cola.
        int plazo = ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS + 4 * SA_MINUTOS;
        Pedido varado = new Pedido(1, new Nodo(30, 18), 2, 0, plazo);
        SimulacionEnCurso simulacion = crearOrquestador(List.of(varado), semilla -> escenario -> new SolucionRuteo())
                .iniciar(true);

        for (int instante = 0; instante < plazo; instante += SA_MINUTOS) {
            assertFalse(simulacion.avanzar(instante).isColapsoDeclarado());
        }
        ResultadoPaso paso = simulacion.avanzar(plazo);

        assertTrue(paso.isColapsoDeclarado());
        assertTrue(simulacion.estaDetenida());
        ColapsoLogistico colapso = simulacion.getResultado().getColapso().orElseThrow();
        assertEquals(ColapsoLogistico.Causa.PLAZO_VENCIDO_SIN_DESPACHO, colapso.getCausa());
        assertEquals(1, colapso.getIdPedido());
        assertEquals(plazo, colapso.getInstante());
        assertTrue(colapso.getVehiculo().isEmpty());
    }

    private static Orquestador crearOrquestador(List<Pedido> pedidos) {
        return crearOrquestador(pedidos, PlanificadorGA::new);
    }

    private static Orquestador crearOrquestador(List<Pedido> pedidos,
                                                LongFunction<AlgoritmoMetaheuristico> fabricaAlgoritmo) {
        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(almacenes.get(0));
        return new Orquestador(almacenes, flota, pedidos, List.of(), new Malla(), SA_MINUTOS,
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS, ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS,
                ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS, SEMILLA, fabricaAlgoritmo);
    }

    private static List<Pedido> pedidos() {
        return List.of(
                new Pedido(1, new Nodo(30, 18), 3, 0, PLAZO_REGULAR),
                new Pedido(2, new Nodo(20, 30), 5, 0, PLAZO_REGULAR),
                new Pedido(3, new Nodo(50, 25), 2, 45, PLAZO_REGULAR),
                new Pedido(4, new Nodo(10, 40), 6, 90, PLAZO_REGULAR),
                new Pedido(5, new Nodo(60, 30), 4, 200, PLAZO_REGULAR),
                new Pedido(6, new Nodo(27, 5), 1, 400, PLAZO_REGULAR));
    }
}
