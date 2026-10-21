package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.OperacionNoPermitidaException;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.TipoAveria;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.BloqueoEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.UnidadEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.ConstructorInstantanea;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.ServicioDifusion;
import pe.pucp.paqtracker.modulos.difusion.dominio.PuertoDifusion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.AveriaProgramada;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DetallePedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ResultadoRegistroPedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudAveriaEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudPedidoEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.FabricaAlgoritmo;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.ServicioPlanificacion;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.soporte.PropiedadesPrueba;
import pe.pucp.paqtracker.soporte.RelojControlable;
import pe.pucp.paqtracker.util.Malla;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas del motor de ejecucion con reloj controlable: el motor solo avanza cuando la prueba mueve
 * el reloj y pide un tick. Semilla fija.
 */
class MotorEjecucionTest {

    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private static final ZonedDateTime INICIO = ZonedDateTime.of(2026, 1, 1, 0, 0, 0, 0, ZONA);
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

    @Test
    void procesarTick_pedidoImposibleConDetencion_alertaTraeElPedidoQueColapsa() {
        MotorEjecucion motor = crearMotor(List.of(new Pedido(1, new Nodo(67, 14), 2, 0, 1)), true);
        motor.preparar();
        motor.iniciar();

        pared.avanzar(Duration.ofMinutes(1));
        motor.procesarTickAhora();

        Map<String, Object> detalle = eventos.stream().filter(evento -> evento.tipo().equals("ALERTA_COLAPSO"))
                .findFirst().orElseThrow().detalle();
        assertEquals(NomenclaturaOperacion.codigoPedido(1), detalle.get("codigoPedido"));
        assertEquals("ENTREGA_TARDIA", detalle.get("causa"));
        assertTrue((int) detalle.get("retrasoMinutos") > 0);
        assertNotNull(detalle.get("unidad"));
    }

    @Test
    void procesarTick_bloqueoQueEmpiezaYTermina_difundeInicioLevantamientoYPolilinea() {
        Bloqueo bloqueo = new Bloqueo(60, 120, Malla.nodosDeTramo(25, 45, 45, 45),
                List.of(new Nodo(25, 45), new Nodo(45, 45)));
        MotorEjecucion motor = crearMotor(pedidos(), List.of(bloqueo), ComposicionFlota.porDefecto(), false);
        motor.preparar();
        motor.iniciar();

        pared.avanzar(Duration.ofSeconds(90));
        motor.procesarTickAhora();
        List<BloqueoEnMapa> vigentes = motor.getUltimaInstantanea().bloqueos();
        pared.avanzar(Duration.ofMinutes(1));
        motor.procesarTickAhora();

        assertTrue(hayEvento("BLOQUEO_INICIADO"));
        assertTrue(hayEvento("BLOQUEO_LEVANTADO"));
        assertEquals(1, vigentes.size());
        assertEquals(List.of(new Coordenada(25, 45), new Coordenada(45, 45)), vigentes.get(0).puntos());
        assertTrue(motor.getUltimaInstantanea().bloqueos().isEmpty());
    }

    @Test
    void procesarTick_dosMinutosReales_informaInicioYTiemposTranscurridos() {
        MotorEjecucion motor = crearMotor(pedidos(), false);
        motor.preparar();
        Instant inicio = pared.instant();
        motor.iniciar();

        pared.avanzar(Duration.ofMinutes(2));
        motor.procesarTickAhora();

        MensajeEstadoEjecucion instantanea = motor.getUltimaInstantanea();
        assertEquals(inicio.toEpochMilli(), instantanea.relojRealInicioMs());
        assertEquals(Duration.ofMinutes(2).toMillis(), instantanea.tiempoRealTranscurridoMs());
        assertEquals(Duration.ofHours(2).toMillis(), instantanea.tiempoSimuladoTranscurridoMs());
    }

    @Test
    void preparar_flotaDeDosPorTipo_difundeSeisUnidadesConCodigosPorTipo() {
        MotorEjecucion motor = crearMotor(pedidos(), List.of(), new ComposicionFlota(2, 2, 2), false);

        motor.preparar();

        assertEquals(List.of("A-01", "A-02", "M-01", "M-02", "B-01", "B-02"),
                motor.getUltimaInstantanea().unidades().stream().map(UnidadEnMapa::codigo).toList());
        assertEquals(2, guardados.get("prueba").motos());
    }

    @Test
    void consultarPedido_pedidoEntregado_traeSuTrazabilidadCompleta() {
        MotorEjecucion motor = crearMotor(pedidos(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofMinutes(12));
        motor.procesarTickAhora();

        DetallePedido detalle = motor.consultarPedido(1).orElseThrow();

        assertEquals("ENTREGADO", detalle.pedido().estado());
        assertEquals("Registrado", detalle.hitos().get(0).titulo());
        assertTrue(detalle.hitos().stream().anyMatch(hito -> hito.titulo().equals("Despachado")));
        assertTrue(detalle.hitos().get(detalle.hitos().size() - 1).titulo().startsWith("Entregado"));
        assertTrue(motor.consultarPedido(999).isEmpty());
    }

    @Test
    void programarAveria_ejecucionEnCurso_laEncolaYLaAplicaRecienEnElSiguienteTick() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofSeconds(70));
        motor.procesarTickAhora();

        AveriaProgramada programada = motor.programarAveria(new SolicitudAveriaEnVivo("A-01", TipoAveria.TIPO_2));

        assertEquals("A-01", programada.codigoUnidad());
        assertEquals(2, programada.tipo());
        assertEquals(INICIO.plusMinutes(70).toInstant().toEpochMilli(), programada.instanteMs());
        assertEquals(INICIO.plusMinutes(70 + 240).toInstant().toEpochMilli(), programada.trasladoCentralMs());
        assertEquals("DISPONIBLE_EN_ALMACEN", unidad(motor, "A-01").estado());
        assertFalse(hayEvento("UNIDAD_AVERIADA"));

        motor.procesarTickAhora();

        assertEquals("AVERIADA", unidad(motor, "A-01").estado());
        assertEquals(1, motor.getUltimaInstantanea().indicadores().unidadesAveriadas());
        Map<String, Object> detalle = detalleDe("UNIDAD_AVERIADA");
        assertEquals("A-01", detalle.get("unidad"));
        assertEquals(2, detalle.get("tipo"));
        assertEquals(false, detalle.get("conservaCarga"));
    }

    @Test
    void programarAveria_tipo2EnRutaConCarga_liberaLosPedidosYReplanificaEnElMismoTick() {
        MotorEjecucion motor = crearMotor(pedidos(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofSeconds(5));
        motor.procesarTickAhora();
        UnidadEnMapa cargada = unidadConCarga(motor);

        motor.programarAveria(new SolicitudAveriaEnVivo(cargada.codigo(), TipoAveria.TIPO_2));
        motor.procesarTickAhora();

        List<String> tipos = eventos.stream().map(MensajeEventoEjecucion::tipo).toList();
        int indiceAveria = tipos.indexOf("UNIDAD_AVERIADA");
        assertTrue(tipos.subList(indiceAveria, tipos.size()).contains("PLAN_ACTUALIZADO"));
        assertFalse(((List<?>) detalleDe("UNIDAD_AVERIADA").get("pedidosLiberados")).isEmpty());
        UnidadEnMapa averiada = unidad(motor, cargada.codigo());
        assertEquals("AVERIADA", averiada.estado());
        assertEquals(0, averiada.cargaActual());
        assertEquals(detalleDe("UNIDAD_AVERIADA").get("ubicacion"), averiada.ubicacionActual());
        assertNotEquals(new Coordenada(27, 14), averiada.ubicacionActual());
    }

    @Test
    void programarAveria_tipo1EnRutaConCarga_quedaDetenidaConSuCargaYSeReincorpora() {
        MotorEjecucion motor = crearMotor(pedidos(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofSeconds(5));
        motor.procesarTickAhora();
        UnidadEnMapa cargada = unidadConCarga(motor);

        motor.programarAveria(new SolicitudAveriaEnVivo(cargada.codigo(), TipoAveria.TIPO_1));
        motor.procesarTickAhora();

        UnidadEnMapa detenida = unidad(motor, cargada.codigo());
        assertEquals("AVERIADA", detenida.estado());
        assertEquals(cargada.cargaActual(), detenida.cargaActual());
        assertEquals("AVERIA", detenida.tramoEnCurso().tipo());
        assertEquals(true, detalleDe("UNIDAD_AVERIADA").get("conservaCarga"));

        // Se reincorpora a los 125 minutos simulados: hace falta un paso Sa posterior.
        pared.avanzar(Duration.ofMinutes(3));
        motor.procesarTickAhora();

        assertTrue(hayEvento("UNIDAD_REINCORPORADA"));
        assertNotEquals("AVERIADA", unidad(motor, cargada.codigo()).estado());
    }

    @Test
    void programarAveria_tipo1ConUnPedidoUrgenteABordo_loTrasbordaAOtraUnidadYLoDifunde() {
        MotorEjecucion motor = crearMotor(List.of(new Pedido(1, new Nodo(30, 18), 3, 0, 60)), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofSeconds(5));
        motor.procesarTickAhora();
        UnidadEnMapa cargada = unidadConCarga(motor);

        motor.programarAveria(new SolicitudAveriaEnVivo(cargada.codigo(), TipoAveria.TIPO_1));
        motor.procesarTickAhora();

        Map<String, Object> trasbordo = detalleDe("TRASBORDO");
        String receptora = (String) trasbordo.get("unidadReceptora");
        assertEquals(cargada.codigo(), trasbordo.get("unidadAveriada"));
        assertEquals(List.of(NomenclaturaOperacion.codigoPedido(1)), trasbordo.get("pedidos"));
        assertEquals(false, detalleDe("UNIDAD_AVERIADA").get("conservaCarga"));
        assertEquals("VIAJE_A_TRASBORDO", unidad(motor, receptora).tramoEnCurso().tipo());
        DetallePedido pedido = motor.consultarPedido(1).orElseThrow();
        assertEquals(receptora, pedido.pedido().unidad());
        assertEquals("Trasbordado", pedido.hitos().get(pedido.hitos().size() - 1).titulo());
    }

    @Test
    void programarAveria_ejecucionPausada_seAplicaAlReanudar() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();
        motor.iniciar();
        pared.avanzar(Duration.ofSeconds(70));
        motor.procesarTickAhora();
        motor.pausar();

        motor.programarAveria(new SolicitudAveriaEnVivo("M-01", TipoAveria.TIPO_3));
        motor.procesarTickAhora();
        assertFalse(hayEvento("UNIDAD_AVERIADA"));

        motor.iniciar();
        motor.procesarTickAhora();
        assertEquals("AVERIADA", unidad(motor, "M-01").estado());
    }

    @Test
    void programarAveria_ejecucionSinIniciar_lanzaOperacionNoPermitida() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();

        assertThrows(OperacionNoPermitidaException.class,
                () -> motor.programarAveria(new SolicitudAveriaEnVivo("A-01", TipoAveria.TIPO_1)));
    }

    @Test
    void programarAveria_ejecucionTerminada_lanzaOperacionNoPermitida() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();
        motor.iniciar();
        motor.detener();

        assertThrows(OperacionNoPermitidaException.class,
                () -> motor.programarAveria(new SolicitudAveriaEnVivo("A-01", TipoAveria.TIPO_1)));
    }

    @Test
    void programarAveria_simulacionHastaElColapso_lanzaOperacionNoPermitida() {
        MotorEjecucion motor = crearMotor(List.of(), List.of(), ComposicionFlota.porDefecto(), false,
                TipoEscenario.COLAPSO_LOGISTICO);
        motor.preparar();
        motor.iniciar();

        assertThrows(OperacionNoPermitidaException.class,
                () -> motor.programarAveria(new SolicitudAveriaEnVivo("A-01", TipoAveria.TIPO_1)));
    }

    @Test
    void programarAveria_unidadQueNoEsDeLaFlota_lanzaRecursoNoEncontrado() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();
        motor.iniciar();

        assertThrows(RecursoNoEncontradoException.class,
                () -> motor.programarAveria(new SolicitudAveriaEnVivo("Z-99", TipoAveria.TIPO_1)));
    }

    @Test
    void programarAveria_unidadYaAveriadaOConAveriaEncolada_lanzaOperacionNoPermitida() {
        MotorEjecucion motor = crearMotor(List.of(), false);
        motor.preparar();
        motor.iniciar();
        motor.programarAveria(new SolicitudAveriaEnVivo("B-01", TipoAveria.TIPO_2));

        assertThrows(OperacionNoPermitidaException.class,
                () -> motor.programarAveria(new SolicitudAveriaEnVivo("B-01", TipoAveria.TIPO_1)));
        pared.avanzar(Duration.ofSeconds(10));
        motor.procesarTickAhora();
        assertThrows(OperacionNoPermitidaException.class,
                () -> motor.programarAveria(new SolicitudAveriaEnVivo("B-01", TipoAveria.TIPO_1)));
    }

    private boolean hayEvento(String tipo) {
        return eventos.stream().anyMatch(evento -> evento.tipo().equals(tipo));
    }

    private Map<String, Object> detalleDe(String tipo) {
        return eventos.stream().filter(evento -> evento.tipo().equals(tipo)).findFirst().orElseThrow().detalle();
    }

    private static UnidadEnMapa unidad(MotorEjecucion motor, String codigo) {
        return motor.getUltimaInstantanea().unidades().stream().filter(unidad -> unidad.codigo().equals(codigo))
                .findFirst().orElseThrow();
    }

    private static UnidadEnMapa unidadConCarga(MotorEjecucion motor) {
        return motor.getUltimaInstantanea().unidades().stream().filter(unidad -> unidad.cargaActual() > 0)
                .findFirst().orElseThrow();
    }

    private MotorEjecucion crearMotor(List<Pedido> pedidos, boolean detenerEnColapso) {
        return crearMotor(pedidos, List.of(), ComposicionFlota.porDefecto(), detenerEnColapso);
    }

    private MotorEjecucion crearMotor(List<Pedido> pedidos, List<Bloqueo> bloqueos, ComposicionFlota flota,
                                      boolean detenerEnColapso) {
        return crearMotor(pedidos, bloqueos, flota, detenerEnColapso, TipoEscenario.SIMULACION_PERIODO);
    }

    private MotorEjecucion crearMotor(List<Pedido> pedidos, List<Bloqueo> bloqueos, ComposicionFlota flota,
                                      boolean detenerEnColapso, TipoEscenario tipoEscenario) {
        PropiedadesDominio propiedades = PropiedadesPrueba.crear();
        LineaTiempo lineaTiempo = new LineaTiempo(INICIO);
        SimulacionEnCurso simulacion = new ServicioPlanificacion(new FabricaAlgoritmo()).prepararSimulacion(
                new SolicitudPreparacionSimulacion(pedidos, bloqueos, AlgoritmoPlanificacion.GA, 1L, SA,
                        detenerEnColapso, flota));
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(lineaTiempo, propiedades.semaforo(),
                CodigosFlota.de(simulacion.getFlota()), 100);
        ConfiguracionMotor configuracion = new ConfiguracionMotor("prueba", "Prueba",
                tipoEscenario, AlgoritmoPlanificacion.GA, LocalDate.of(2026, 1, 1), 2, FACTOR,
                SC_SIN_TICK_PROGRAMADO, SA, Integer.MAX_VALUE, pared.instant(), flota);
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
                new ServicioDifusion(new ConstructorInstantanea(propiedades), puerto), repositorio,
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
