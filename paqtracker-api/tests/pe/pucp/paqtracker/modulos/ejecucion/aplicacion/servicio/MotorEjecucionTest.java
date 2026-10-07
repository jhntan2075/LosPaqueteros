package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.OperacionNoPermitidaException;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.ConstructorInstantanea;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.ServicioDifusion;
import pe.pucp.paqtracker.modulos.difusion.dominio.PuertoDifusion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ResultadoRegistroPedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudPedidoEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.FabricaAlgoritmo;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.ServicioPlanificacion;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.soporte.RelojControlable;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas del motor de ejecucion con reloj controlable: el motor solo avanza cuando la prueba mueve
 * el reloj y pide un tick. Semilla fija.
 */
class MotorEjecucionTest {

    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private static final double FACTOR = 60.0;
    private static final int SA = 30;
    private static final int HORIZONTE = 2 * 1440;
    private static final int PLAZO_REGULAR = 2160;
    /** Sc muy largo: el tick programado no corre durante la prueba; los ticks los pide la prueba. */
    private static final int SC_SIN_TICK_PROGRAMADO = 3600;

    private final RelojControlable pared = new RelojControlable(Instant.parse("2026-01-01T05:00:00Z"), ZONA);
    private final List<MensajeEventoEjecucion> eventos = new CopyOnWriteArrayList<>();
    private final Map<String, RegistroEjecucion> guardados = new ConcurrentHashMap<>();

    @Test
    void preparar_ejecucionNueva_quedaConfiguradaConTodaLaFlota() {
        MotorEjecucion motor = crearMotor(pedidos(), false);

        motor.preparar();

        MensajeEstadoEjecucion instantanea = motor.getUltimaInstantanea();
        assertEquals("CONFIGURADA", instantanea.estado());
        assertEquals(37, instantanea.unidades().size());
        assertEquals(3, instantanea.almacenes().size());
        assertEquals(EstadoEjecucion.CONFIGURADA, guardados.get("prueba").estado());
    }

    @Test
    void procesarTick_doceHorasSimuladas_planificaEntregaYDifundeEventos() {
        MotorEjecucion motor = crearMotor(pedidos(), false);
        motor.preparar();
        motor.iniciar();

        pared.avanzar(Duration.ofMinutes(12));
        motor.procesarTickAhora();

        MensajeEstadoEjecucion instantanea = motor.getUltimaInstantanea();
        assertEquals("EN_CURSO", instantanea.estado());
        assertTrue(hayEvento("NUEVO_PEDIDO"));
        assertTrue(hayEvento("PLAN_ACTUALIZADO"));
        assertTrue(hayEvento("PEDIDO_ENTREGADO"));
        assertTrue(instantanea.indicadores().pedidosEntregadosATiempo() > 0);
    }

    @Test
    void procesarTick_alcanzaElHorizonte_finalizaYGuardaElResultado() {
        MotorEjecucion motor = crearMotor(pedidos(), false);
        motor.preparar();
        motor.iniciar();

        pared.avanzar(Duration.ofHours(1));
        motor.procesarTickAhora();

        assertEquals(EstadoEjecucion.FINALIZADA, motor.getEstado());
        assertNotNull(guardados.get("prueba").finalizadaEn());
        assertEquals(pedidos().size(), guardados.get("prueba").entregas());
        assertTrue(hayEvento("EJECUCION_FINALIZADA"));
        assertThrows(OperacionNoPermitidaException.class, motor::iniciar);
    }

    @Test
    void pausar_relojAvanzaEnPausa_noAvanzaLaSimulacion() {
        MotorEjecucion motor = crearMotor(pedidos(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofMinutes(2));
        motor.procesarTickAhora();
        long relojAntes = motor.getUltimaInstantanea().relojSimuladoMs();

        motor.pausar();
        pared.avanzar(Duration.ofMinutes(10));
        motor.procesarTickAhora();

        assertEquals(EstadoEjecucion.PAUSADA, motor.getEstado());
        assertEquals(relojAntes, motor.getUltimaInstantanea().relojSimuladoMs());
    }

    @Test
    void registrarPedido_ejecucionEnCurso_replanificaYLoDespachaDeInmediato() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofMinutes(1));

        ResultadoRegistroPedido resultado = motor.registrarPedido(new SolicitudPedidoEnVivo(35, 20, 3, PLAZO_REGULAR));

        assertTrue(resultado.replanifico());
        assertEquals("EN_TRANSITO", resultado.pedido().estado());
        assertNotNull(resultado.pedido().unidad());
        assertEquals(1, resultado.unidadesDespachadas());
    }

    @Test
    void registrarPedido_enElMismoMinutoDelUltimoPaso_replanificaIgual() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofMinutes(1));
        motor.procesarTickAhora();

        ResultadoRegistroPedido resultado = motor.registrarPedido(new SolicitudPedidoEnVivo(35, 20, 3, PLAZO_REGULAR));

        assertTrue(resultado.replanifico());
        assertEquals("EN_TRANSITO", resultado.pedido().estado());
    }

    @Test
    void procesarTick_pedidoImposibleConDetencion_quedaColapsada() {
        // Plazo de un minuto a 40 km del central: ninguna unidad puede llegar a tiempo.
        MotorEjecucion motor = crearMotor(List.of(new Pedido(1, new Nodo(67, 14), 2, 0, 1)), true);
        motor.preparar();
        motor.iniciar();

        pared.avanzar(Duration.ofMinutes(1));
        motor.procesarTickAhora();

        assertEquals(EstadoEjecucion.COLAPSADA, motor.getEstado());
        assertTrue(hayEvento("ALERTA_COLAPSO"));
        assertNotNull(guardados.get("prueba").fechaColapso());
    }

    private boolean hayEvento(String tipo) {
        return eventos.stream().anyMatch(evento -> evento.tipo().equals(tipo));
    }

    private MotorEjecucion crearMotor(List<Pedido> pedidos, boolean detenerEnColapso) {
        LineaTiempo lineaTiempo = new LineaTiempo(ZonedDateTime.of(2026, 1, 1, 0, 0, 0, 0, ZONA));
        SimulacionEnCurso simulacion = new ServicioPlanificacion(new FabricaAlgoritmo()).prepararSimulacion(
                new SolicitudPreparacionSimulacion(pedidos, List.of(), AlgoritmoPlanificacion.GA, 1L, SA,
                        detenerEnColapso));
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(lineaTiempo,
                new PropiedadesDominio.Semaforo(0.15, 0.40), 100);
        ConfiguracionMotor configuracion = new ConfiguracionMotor("prueba", "Prueba",
                TipoEscenario.SIMULACION_PERIODO, AlgoritmoPlanificacion.GA, LocalDate.of(2026, 1, 1), 2, FACTOR,
                SC_SIN_TICK_PROGRAMADO, SA, Integer.MAX_VALUE, pared.instant());
        PuertoDifusion puerto = new PuertoDifusion() {
            @Override
            public void publicarEstado(MensajeEstadoEjecucion mensaje) {
                // La prueba lee la ultima instantanea desde el motor.
            }

            @Override
            public void publicarEvento(MensajeEventoEjecucion mensaje) {
                eventos.add(mensaje);
            }
        };
        RepositorioEjecucion repositorio = new RepositorioEjecucion() {
            @Override
            public void guardar(RegistroEjecucion registro) {
                guardados.put(registro.id(), registro);
            }

            @Override
            public Optional<RegistroEjecucion> buscar(String id) {
                return Optional.ofNullable(guardados.get(id));
            }

            @Override
            public int cerrarInterrumpidas(Instant finalizadaEn) {
                return 0;
            }
        };
        return new MotorEjecucion(configuracion, lineaTiempo, 0, HORIZONTE, simulacion, seguimiento,
                new RelojEjecucion(pared, 0, FACTOR), pared,
                new ServicioDifusion(new ConstructorInstantanea(), puerto), repositorio,
                Executors.newSingleThreadScheduledExecutor());
    }

    private static List<Pedido> pedidos() {
        return List.of(
                new Pedido(1, new Nodo(30, 18), 3, 0, PLAZO_REGULAR),
                new Pedido(2, new Nodo(20, 30), 5, 0, PLAZO_REGULAR),
                new Pedido(3, new Nodo(50, 25), 2, 45, PLAZO_REGULAR),
                new Pedido(4, new Nodo(10, 40), 6, 90, PLAZO_REGULAR),
                new Pedido(5, new Nodo(60, 30), 4, 200, PLAZO_REGULAR));
    }
}
