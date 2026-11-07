package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pe.pucp.paqtracker.comun.excepcion.OperacionNoPermitidaException;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Averia;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.TipoAveria;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AveriaEnCurso;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.ContextoInstantanea;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.RecorridoCamino;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.ServicioDifusion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.AveriaProgramada;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DetallePedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.EstimacionAveria;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.PlanEstable;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RutaPlanificada;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ResultadoRegistroPedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudAveriaEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudPedidoEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.simulacion.AveriaAplicada;
import pe.pucp.paqtracker.simulacion.ColapsoLogistico;
import pe.pucp.paqtracker.simulacion.ResultadoPaso;
import pe.pucp.paqtracker.simulacion.ResultadoSimulacion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.simulacion.Trasbordo;
import pe.pucp.paqtracker.simulacion.UnidadEnTransito;
import java.util.ArrayList;
import java.time.Clock;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

/**
 * Motor de una ejecucion: proceso continuo que corre en su propio hilo. En cada salto de consumo Sc
 * lee el reloj simulado, ejecuta los pasos Sa que correspondan (planificacion y despacho dentro del
 * nucleo), actualiza el seguimiento de pedidos y difunde la instantanea y los eventos.
 *
 * Todo el estado mutable (simulacion, seguimiento, reloj) se toca solo desde el hilo del motor; las
 * peticiones de otros hilos se encolan en ese hilo y esperan su resultado.
 */
public final class MotorEjecucion {

    private static final Logger LOGGER = LoggerFactory.getLogger(MotorEjecucion.class);
    private static final long ESPERA_MAXIMA_SEGUNDOS = 60;
    private static final long SIN_COMPUTO = -1L;

    private final ConfiguracionMotor configuracion;
    private final LineaTiempo lineaTiempo;
    private final int horizonte;
    private final SimulacionEnCurso simulacion;
    private final SeguimientoPedidos seguimiento;
    private final RelojEjecucion reloj;
    private final Clock relojPared;
    private final ServicioDifusion difusion;
    private final RepositorioEjecucion repositorio;
    private final ScheduledExecutorService ejecutor;
    private final int minutoInicial;
    private final CodigosFlota codigosFlota;
    private final Set<Integer> bloqueosVigentes = new HashSet<>();
    private final GestorEventos agenda = new GestorEventos();
    /** Averias aplicadas que siguen vigentes, por unidad; se difunden en cada instantanea. */
    private final Map<Integer, AveriaEnCurso> averiasEnCurso = new HashMap<>();
    private volatile EstadoEjecucion estado = EstadoEjecucion.CONFIGURADA;
    private volatile MensajeEstadoEjecucion ultimaInstantanea;
    /** Plan vigente tras la ultima planificacion que termino sin colapso; null hasta la primera. */
    private volatile PlanEstable planEstable;
    private int siguientePaso;
    private long pasoSc;

    /**
     * @param configuracion parametros fijos de la ejecucion
     * @param lineaTiempo   relacion entre minutos simulados y fechas
     * @param minutoInicial minuto en el que arranca el reloj
     * @param horizonte     minuto en el que termina la ejecucion
     * @param simulacion    simulacion preparada por el modulo de planificacion
     * @param seguimiento   seguimiento de pedidos de la ejecucion
     * @param reloj         reloj simulado
     * @param relojPared    reloj real
     * @param difusion      fachada de difusion
     * @param repositorio   persistencia de la ejecucion
     * @param ejecutor      ejecutor de un solo hilo, propio de esta ejecucion
     */
    public MotorEjecucion(ConfiguracionMotor configuracion, LineaTiempo lineaTiempo, int minutoInicial,
                          int horizonte, SimulacionEnCurso simulacion, SeguimientoPedidos seguimiento,
                          RelojEjecucion reloj, Clock relojPared, ServicioDifusion difusion,
                          RepositorioEjecucion repositorio, ScheduledExecutorService ejecutor) {
        this.configuracion = configuracion;
        this.lineaTiempo = lineaTiempo;
        this.horizonte = horizonte;
        this.simulacion = simulacion;
        this.seguimiento = seguimiento;
        this.reloj = reloj;
        this.relojPared = relojPared;
        this.difusion = difusion;
        this.repositorio = repositorio;
        this.ejecutor = ejecutor;
        this.minutoInicial = minutoInicial;
        this.siguientePaso = minutoInicial;
        this.codigosFlota = CodigosFlota.de(simulacion.getFlota());
    }

    /**
     * Guarda la ejecucion y difunde su primera instantanea, aun sin correr el reloj.
     */
    public void preparar() {
        enHiloMotor(() -> {
            guardar(null);
            difundirEstado();
            return null;
        });
    }

    /**
     * Arranca el reloj (si esta configurada) o lo reanuda (si esta pausada).
     *
     * @throws OperacionNoPermitidaException si la ejecucion ya corre o termino
     */
    public void iniciar() {
        enHiloMotor(() -> {
            if (estado != EstadoEjecucion.CONFIGURADA && estado != EstadoEjecucion.PAUSADA) {
                throw new OperacionNoPermitidaException("No se puede iniciar la ejecución "
                        + configuracion.id() + " en estado " + estado);
            }
            if (estado == EstadoEjecucion.CONFIGURADA) {
                ejecutor.scheduleWithFixedDelay(this::procesarTickProtegido, configuracion.scSegundos(),
                        configuracion.scSegundos(), TimeUnit.SECONDS);
            }
            reloj.correr();
            cambiarEstado(EstadoEjecucion.EN_CURSO);
            return null;
        });
    }

    /**
     * Detiene el reloj conservando el estado; se reanuda con {@link #iniciar()}.
     *
     * @throws OperacionNoPermitidaException si la ejecucion no esta en curso
     */
    public void pausar() {
        enHiloMotor(() -> {
            if (estado != EstadoEjecucion.EN_CURSO) {
                throw new OperacionNoPermitidaException("No se puede pausar la ejecución "
                        + configuracion.id() + " en estado " + estado);
            }
            reloj.pausar();
            cambiarEstado(EstadoEjecucion.PAUSADA);
            return null;
        });
    }

    /**
     * Termina la ejecucion antes de su horizonte.
     *
     * @throws OperacionNoPermitidaException si ya termino
     */
    public void detener() {
        enHiloMotor(() -> {
            if (estado.esTerminal()) {
                throw new OperacionNoPermitidaException("La ejecución " + configuracion.id() + " ya terminó");
            }
            terminar(EstadoEjecucion.FINALIZADA);
            return null;
        });
    }

    /**
     * Registra un pedido en el instante actual del reloj (CU-01) y, si la ejecucion corre, replanifica
     * de inmediato en lugar de esperar al siguiente salto Sa (CU-12).
     *
     * @param solicitud datos del pedido, ya validados
     * @return pedido con su estado tras la replanificacion
     * @throws OperacionNoPermitidaException si la ejecucion ya termino
     */
    public ResultadoRegistroPedido registrarPedido(SolicitudPedidoEnVivo solicitud) {
        return enHiloMotor(() -> {
            if (estado.esTerminal()) {
                throw new OperacionNoPermitidaException("La ejecución " + configuracion.id() + " ya terminó");
            }
            int instante = (int) Math.floor(minutoVisible());
            Pedido pedido = new Pedido(seguimiento.reservarId(), new Nodo(solicitud.x(), solicitud.y()),
                    solicitud.cantidad(), instante, solicitud.plazoMinutos());
            simulacion.agregarPedido(pedido);
            seguimiento.registrar(pedido);
            ResultadoPaso paso = null;
            if (estado == EstadoEjecucion.EN_CURSO && !simulacion.estaDetenida()) {
                // Si el ultimo paso cayo en este mismo minuto, se replanifica un minuto despues: esperar al
                // siguiente Sa dejaria el pedido sin ruta hasta 30 minutos reales en el dia a dia.
                int instantePaso = Math.max(instante, simulacion.getUltimoInstante() + 1);
                paso = ejecutarPaso(instantePaso);
                while (siguientePaso <= instantePaso) {
                    siguientePaso += configuracion.saMinutos();
                }
            }
            difundirEstado();
            boolean replanifico = paso != null && paso.huboPlanificacion();
            return new ResultadoRegistroPedido(configuracion.id(), seguimiento.pedido(pedido.getId(), instante),
                    replanifico, replanifico ? paso.getTiempoComputoMs() : SIN_COMPUTO,
                    paso == null ? 0 : paso.getUnidadesDespachadas().size());
        });
    }

    /**
     * Registra una averia en el instante actual del reloj (CU-13). Valida la averia contra el estado de
     * la ejecucion y la encola en la agenda, sin tocar la simulacion: el motor la aplica al inicio de su
     * siguiente salto Sc y en ese momento repara su carga (trasvase o respaldo), sin replanificar la cola.
     *
     * @param solicitud unidad y tipo de la averia
     * @return averia programada, con su instante y su reincorporacion estimada
     * @throws OperacionNoPermitidaException si el escenario no admite averias, la ejecucion no esta en
     *                                       curso ni pausada, o la unidad ya esta averiada
     * @throws RecursoNoEncontradoException  si la unidad no pertenece a la flota de la ejecucion
     */
    public AveriaProgramada programarAveria(SolicitudAveriaEnVivo solicitud) {
        return enHiloMotor(() -> {
            validarQueAdmiteAverias();
            int idVehiculo = codigosFlota.idDe(solicitud.codigoUnidad()).orElseThrow(() ->
                    new RecursoNoEncontradoException("unidad", solicitud.codigoUnidad() + " en la ejecución "
                            + configuracion.id()));
            Vehiculo vehiculo = buscarVehiculo(idVehiculo);
            String codigo = codigosFlota.codigo(vehiculo);
            if (vehiculo.getEstado() == EstadoVehiculo.AVERIADA || agenda.tieneAveriaPendiente(idVehiculo)
                    || simulacion.tieneAveriaPendiente(idVehiculo)) {
                throw new OperacionNoPermitidaException("La unidad " + codigo + " ya está averiada");
            }
            int instante = instanteParaAveria();
            agenda.encolar(new GestorEventos.EventoAveria(idVehiculo, solicitud.tipo(), instante));
            Averia averia = new Averia(instante, idVehiculo, solicitud.tipo());
            return new AveriaProgramada(configuracion.id(), codigo, solicitud.tipo().getNumero(),
                    lineaTiempo.aMilisegundos(instante),
                    lineaTiempo.aMilisegundos(averia.getInstanteReincorporacion()),
                    averia.tieneTraslado() ? lineaTiempo.aMilisegundos(averia.getInstanteTraslado()) : null);
        });
    }

    /**
     * Deshace la averia programada de una unidad mientras el motor aun no la aplica.
     *
     * @param codigoUnidad codigo visible de la unidad
     * @throws RecursoNoEncontradoException  si la unidad no existe en la ejecucion
     * @throws OperacionNoPermitidaException si la unidad no tiene una averia por aplicarse (ya se aplico)
     */
    public void cancelarAveria(String codigoUnidad) {
        enHiloMotor(() -> {
            int idVehiculo = codigosFlota.idDe(codigoUnidad).orElseThrow(() ->
                    new RecursoNoEncontradoException("unidad", codigoUnidad + " en la ejecución " + configuracion.id()));
            if (!agenda.cancelar(idVehiculo)) {
                throw new OperacionNoPermitidaException("La avería de " + codigoUnidad
                        + " ya se aplico: no se puede deshacer");
            }
            return null;
        });
    }

    /**
     * Cuando se aplicaria y cuando volveria a operar una unidad si ahora se registrara una averia de cada
     * tipo. No registra nada: es la misma cuenta que {@link #programarAveria}.
     *
     * @return una estimacion por tipo, de 1 a 3
     */
    public List<EstimacionAveria> estimarAverias() {
        return enHiloMotor(() -> {
            int instante = instanteParaAveria();
            return Arrays.stream(TipoAveria.values()).map(tipo -> {
                Averia averia = new Averia(instante, -1, tipo);
                return new EstimacionAveria(tipo.getNumero(), lineaTiempo.aMilisegundos(instante),
                        lineaTiempo.aMilisegundos(averia.getInstanteReincorporacion()),
                        averia.tieneTraslado() ? lineaTiempo.aMilisegundos(averia.getInstanteTraslado()) : null);
            }).toList();
        });
    }

    /** Primer minuto en que el motor puede aplicar una averia registrada ahora. */
    private int instanteParaAveria() {
        return Math.max((int) Math.floor(minutoVisible()), simulacion.getUltimoInstante() + 1);
    }

    /**
     * @return todos los pedidos registrados en la ejecucion, con su estado (CU-04)
     */
    public List<PedidoEnMapa> consultarPedidos() {
        return enHiloMotor(() -> seguimiento.todos(minutoVisible()));
    }

    /**
     * @param idPedido identificador del pedido en la ejecucion
     * @return pedido con su trazabilidad (LE-077), o vacio si no esta registrado
     */
    public Optional<DetallePedido> consultarPedido(int idPedido) {
        return enHiloMotor(() -> seguimiento.detalle(idPedido, minutoVisible()));
    }

    /**
     * @return la ultima planificacion estable (G08-G10); si la ejecucion colapso despues, lleva los datos del
     *         colapso. Vacio si todavia no hubo ninguna planificacion
     */
    public Optional<PlanEstable> consultarPlanEstable() {
        return enHiloMotor(() -> {
            if (planEstable == null) {
                return Optional.<PlanEstable>empty();
            }
            Optional<ColapsoLogistico> colapso = simulacion.getResultado().getColapso();
            return Optional.of(colapso.map(c -> planEstable.conColapso(new PlanEstable.ColapsoPlan(
                    lineaTiempo.aMilisegundos(c.getInstante()), NomenclaturaOperacion.codigoPedido(c.getIdPedido()),
                    c.getCausa().name()))).orElse(planEstable));
        });
    }

    /**
     * Procesa un tick en el hilo del motor y espera a que termine. Permite a las pruebas avanzar el
     * motor de forma determinista sin competir con el tick programado.
     */
    void procesarTickAhora() {
        enHiloMotor(() -> {
            procesarTick();
            return null;
        });
    }

    /**
     * Las averias se registran a mano durante la operacion dia a dia y la simulacion de periodo (CU-13);
     * la simulacion hasta el colapso corre sin intervencion del operador. La ejecucion debe haber
     * arrancado y no haber terminado.
     */
    private void validarQueAdmiteAverias() {
        if (configuracion.tipoEscenario() == TipoEscenario.COLAPSO_LOGISTICO) {
            throw new OperacionNoPermitidaException("La ejecución " + configuracion.id()
                    + " es una simulación hasta el colapso: las averías se registran solo en la operación día a"
                    + " día y en la simulación de periodo");
        }
        if (estado != EstadoEjecucion.EN_CURSO && estado != EstadoEjecucion.PAUSADA) {
            throw new OperacionNoPermitidaException("La ejecución " + configuracion.id()
                    + " no está activa (estado " + estado + "): solo admite averías en curso o pausada");
        }
    }

    private Vehiculo buscarVehiculo(int idVehiculo) {
        return simulacion.getFlota().stream().filter(vehiculo -> vehiculo.getId() == idVehiculo).findFirst()
                .orElseThrow(() -> new IllegalStateException("La unidad " + idVehiculo + " no está en la flota"));
    }

    /**
     * Entrega a la simulacion las averias encoladas cuyo instante ya llego y ejecuta de inmediato un paso
     * que las aplica (disparo por evento). Ese paso repara solo lo que la averia afecta; la cola se planifica
     * en el siguiente Sa. Si el ultimo paso ya cayo en el instante de la averia, se aplica un minuto
     * despues: un paso no puede repetir su instante.
     *
     * @param minuto minuto simulado actual
     */
    private void aplicarEventosAgendados(double minuto) {
        List<GestorEventos.EventoAveria> eventos = agenda.entregarHasta(minuto);
        if (eventos.isEmpty() || simulacion.estaDetenida()) {
            return;
        }
        int instantePaso = simulacion.getUltimoInstante() + 1;
        for (GestorEventos.EventoAveria evento : eventos) {
            int instante = Math.max(evento.instante(), simulacion.getUltimoInstante() + 1);
            simulacion.agregarAveria(new Averia(instante, evento.idVehiculo(), evento.tipo()));
            instantePaso = Math.max(instantePaso, instante);
        }
        ejecutarPaso(instantePaso, false);
        while (siguientePaso <= instantePaso) {
            siguientePaso += configuracion.saMinutos();
        }
    }

    /**
     * Procesa un salto de consumo: aplica los eventos agendados, ejecuta los pasos Sa vencidos y difunde
     * la instantanea.
     */
    private void procesarTick() {
        if (estado != EstadoEjecucion.EN_CURSO) {
            return;
        }
        double minuto = minutoVisible();
        aplicarEventosAgendados(minuto);
        int pasos = 0;
        while (siguientePaso <= minuto && pasos < configuracion.maxPasosPorTick() && !simulacion.estaDetenida()) {
            ejecutarPaso(siguientePaso);
            siguientePaso += configuracion.saMinutos();
            pasos++;
        }
        if (simulacion.estaDetenida()) {
            terminar(EstadoEjecucion.COLAPSADA);
        } else if (siguientePaso > horizonte) {
            simulacion.cerrar(horizonte);
            terminar(EstadoEjecucion.FINALIZADA);
        } else {
            difundirCambiosDeBloqueos(minuto);
            difundirEstado();
        }
    }

    /**
     * Compara los bloqueos vigentes con los del tick anterior y difunde los que empiezan y terminan.
     */
    private void difundirCambiosDeBloqueos(double minuto) {
        int instante = (int) Math.floor(minuto);
        List<Bloqueo> bloqueos = simulacion.getBloqueos();
        for (int id = 0; id < bloqueos.size(); id++) {
            boolean vigente = bloqueos.get(id).estaVigente(instante);
            if (vigente && bloqueosVigentes.add(id)) {
                evento("BLOQUEO_INICIADO", "Bloqueo " + id + " vigente hasta "
                        + lineaTiempo.formatear(bloqueos.get(id).getInstanteFin()),
                        lineaTiempo.aMilisegundos(bloqueos.get(id).getInstanteInicio()), Map.of("bloqueoId", id));
            } else if (!vigente && bloqueosVigentes.remove(id)) {
                evento("BLOQUEO_LEVANTADO", "Bloqueo " + id + " levantado",
                        lineaTiempo.aMilisegundos(bloqueos.get(id).getInstanteFin()), Map.of("bloqueoId", id));
            }
        }
    }

    /**
     * Ejecuta {@link #procesarTick()} desde el ejecutor programado. Es el borde del proceso continuo:
     * si un tick falla se registra y el motor sigue con el siguiente, en lugar de morir en silencio.
     */
    private void procesarTickProtegido() {
        try {
            procesarTick();
        } catch (RuntimeException excepcion) {
            LOGGER.error("Fallo el tick de la ejecucion {}", configuracion.id(), excepcion);
        }
    }

    private ResultadoPaso ejecutarPaso(int instante) {
        return ejecutarPaso(instante, true);
    }

    private ResultadoPaso ejecutarPaso(int instante, boolean planificar) {
        ResultadoPaso paso = simulacion.avanzar(instante, planificar);
        List<Tramo> completados = seguimiento.aplicar(paso);
        if (paso.huboPlanificacion() && !paso.isColapsoDeclarado()) {
            planEstable = construirPlanEstable(paso);
        }
        difundirEventos(paso, completados);
        return paso;
    }

    /**
     * Copia el plan vigente tras un paso que planifico: cada unidad en transito con entregas pendientes, en el
     * orden de su ruta, y los pedidos que quedaron en la cola.
     */
    private PlanEstable construirPlanEstable(ResultadoPaso paso) {
        int instante = paso.getInstante();
        List<RutaPlanificada> rutas = new ArrayList<>();
        for (UnidadEnTransito transito : simulacion.getUnidadesEnTransito()) {
            List<RutaPlanificada.ParadaPlanificada> paradas = new ArrayList<>();
            int carga = 0;
            int distancia = 0;
            int regreso = transito.getSalida();
            for (Tramo tramo : transito.getTramos()) {
                distancia += tramo.getDistancia();
                regreso = Math.max(regreso, tramo.getLlegada());
                if (tramo.esEntrega() && tramo.getLlegada() > instante) {
                    carga += tramo.getCantidad();
                    paradas.add(new RutaPlanificada.ParadaPlanificada(
                            NomenclaturaOperacion.codigoPedido(tramo.getIdPedido()),
                            RecorridoCamino.coordenada(tramo.getDestino()), tramo.getCantidad(),
                            lineaTiempo.aMilisegundos(tramo.getLlegada()),
                            lineaTiempo.aMilisegundos(seguimiento.horaLimite(tramo.getIdPedido()))));
                }
            }
            if (!paradas.isEmpty()) {
                Vehiculo vehiculo = transito.getVehiculo();
                rutas.add(new RutaPlanificada(codigosFlota.codigo(vehiculo),
                        NomenclaturaOperacion.tipoUnidad(vehiculo.getTipo()),
                        NomenclaturaOperacion.codigoAlmacen(transito.getOrigen()),
                        lineaTiempo.aMilisegundos(transito.getSalida()), lineaTiempo.aMilisegundos(regreso),
                        distancia, carga, vehiculo.getCapacidad(), List.copyOf(paradas)));
            }
        }
        rutas.sort((a, b) -> Long.compare(a.salidaMs(), b.salidaMs()) != 0
                ? Long.compare(a.salidaMs(), b.salidaMs()) : a.unidad().compareTo(b.unidad()));
        List<String> sinAsignar = simulacion.getCola().stream()
                .map(pedido -> NomenclaturaOperacion.codigoPedido(pedido.getId())).toList();
        return new PlanEstable(configuracion.id(), configuracion.tipoEscenario().name(),
                configuracion.algoritmo().name(), lineaTiempo.aMilisegundos(instante), paso.getTiempoComputoMs(),
                paso.getUnidadesDespachadas().size(), List.copyOf(rutas), sinAsignar, null);
    }

    private void difundirEventos(ResultadoPaso paso, List<Tramo> completados) {
        long instanteMs = lineaTiempo.aMilisegundos(paso.getInstante());
        for (Pedido pedido : paso.getPedidosIncorporados()) {
            String codigo = NomenclaturaOperacion.codigoPedido(pedido.getId());
            evento("NUEVO_PEDIDO", "Pedido " + codigo + " registrado: " + pedido.getCantidad() + " paquetes a "
                    + pedido.getDestino(), instanteMs, Map.of("codigoPedido", codigo));
        }
        paso.getAveriasAplicadas().forEach(this::difundirAveria);
        for (Vehiculo vehiculo : paso.getUnidadesReincorporadas()) {
            averiasEnCurso.remove(vehiculo.getId());
            String codigo = codigosFlota.codigo(vehiculo);
            evento("UNIDAD_REINCORPORADA", "Unidad " + codigo + " reincorporada tras su avería", instanteMs,
                    Map.of("unidad", codigo, "estado", vehiculo.getEstado().name()));
        }
        if (paso.huboPlanificacion()) {
            evento("PLAN_ACTUALIZADO", "Planificación en " + paso.getTiempoComputoMs() + " ms: "
                    + paso.getUnidadesDespachadas().size() + " unidades despachadas", instanteMs,
                    Map.of("tiempoComputoMs", paso.getTiempoComputoMs(),
                            "unidadesDespachadas", paso.getUnidadesDespachadas().size()));
        }
        for (Tramo tramo : completados) {
            boolean aTiempo = tramo.getLlegada() <= seguimiento.horaLimite(tramo.getIdPedido());
            String codigo = NomenclaturaOperacion.codigoPedido(tramo.getIdPedido());
            evento("PEDIDO_ENTREGADO", "Pedido " + codigo + (aTiempo ? " entregado a tiempo" : " entregado tarde"),
                    lineaTiempo.aMilisegundos(tramo.getLlegada()), Map.of("codigoPedido", codigo, "aTiempo", aTiempo));
        }
        if (paso.isColapsoDeclarado()) {
            ColapsoLogistico colapso = simulacion.getResultado().getColapso().orElseThrow();
            String codigo = NomenclaturaOperacion.codigoPedido(colapso.getIdPedido());
            evento("ALERTA_COLAPSO", "Colapso logístico: el pedido " + codigo + " no se puede entregar a tiempo",
                    instanteMs, detalleColapso(colapso, codigo));
        }
    }

    /**
     * Difunde una averia aplicada: unidad, tipo, punto en que quedo, si conserva su carga (tipo 1 en ruta),
     * pedidos que vuelven a planificarse (tipo 2 y 3) y cuando se traslada y se reincorpora.
     */
    private void difundirAveria(AveriaAplicada aplicada) {
        Averia averia = aplicada.averia();
        String codigo = codigosFlota.codigo(aplicada.vehiculo());
        List<String> pedidos = aplicada.entregasLiberadas().stream()
                .map(entrega -> NomenclaturaOperacion.codigoPedido(entrega.getIdPedido())).distinct().toList();
        Map<String, Object> detalle = new LinkedHashMap<>();
        detalle.put("unidad", codigo);
        detalle.put("tipo", averia.getTipo().getNumero());
        detalle.put("ubicacion", RecorridoCamino.coordenada(aplicada.ubicacion()));
        detalle.put("conservaCarga", aplicada.conservaCarga());
        detalle.put("pedidosLiberados", pedidos);
        detalle.put("unidadesReceptoras", aplicada.trasbordos().stream()
                .map(trasbordo -> codigosFlota.codigo(trasbordo.receptora().getVehiculo())).toList());
        detalle.put("pedidosRespaldados", aplicada.entregasRespaldadas().stream()
                .map(entrega -> NomenclaturaOperacion.codigoPedido(entrega.getIdPedido())).distinct().toList());
        detalle.put("unidadesRespaldo", aplicada.respaldos().stream()
                .map(respaldo -> codigosFlota.codigo(respaldo.getVehiculo())).toList());
        detalle.put("reincorporacionMs", lineaTiempo.aMilisegundos(aplicada.disponibleEn()));
        Long trasladoMs = null;
        if (aplicada.trasladoEn() != AveriaAplicada.SIN_TRASLADO) {
            trasladoMs = lineaTiempo.aMilisegundos(aplicada.trasladoEn());
            detalle.put("trasladoCentralMs", trasladoMs);
        }
        averiasEnCurso.put(aplicada.vehiculo().getId(), new AveriaEnCurso(averia.getTipo().getNumero(),
                lineaTiempo.aMilisegundos(averia.getInstante()), lineaTiempo.aMilisegundos(aplicada.disponibleEn()),
                trasladoMs));
        String liberados = pedidos.isEmpty() ? "" : ": " + pedidos.size() + " pedidos vuelven a planificarse";
        evento("UNIDAD_AVERIADA", "Unidad " + codigo + " averiada (tipo " + averia.getTipo().getNumero() + ")"
                + liberados, lineaTiempo.aMilisegundos(averia.getInstante()), detalle);
        aplicada.trasbordos().forEach(trasbordo -> difundirTrasbordo(codigo, averia, trasbordo));
    }

    /**
     * Difunde un trasvase decidido ante una averia: que unidad en ruta recoge que pedidos, donde y a que
     * hora llega al punto.
     */
    private void difundirTrasbordo(String codigoAveriada, Averia averia, Trasbordo trasbordo) {
        String receptora = codigosFlota.codigo(trasbordo.receptora().getVehiculo());
        List<String> pedidos = trasbordo.entregas().stream()
                .map(entrega -> NomenclaturaOperacion.codigoPedido(entrega.getIdPedido())).distinct().toList();
        Map<String, Object> detalle = new LinkedHashMap<>();
        detalle.put("unidadAveriada", codigoAveriada);
        detalle.put("unidadReceptora", receptora);
        detalle.put("pedidos", pedidos);
        detalle.put("ubicacion", RecorridoCamino.coordenada(trasbordo.punto()));
        detalle.put("recojoMs", lineaTiempo.aMilisegundos(trasbordo.getRecojo()));
        evento("TRASBORDO", "Unidad " + receptora + " se desvía y recoge " + pedidos.size() + " pedidos de "
                + codigoAveriada, lineaTiempo.aMilisegundos(averia.getInstante()), detalle);
    }

    /**
     * Datos del colapso para el diagnostico del visualizador: pedido que falla, causa, instante del colapso y,
     * si el pedido salio en una unidad, su llegada estimada y la unidad.
     */
    private Map<String, Object> detalleColapso(ColapsoLogistico colapso, String codigoPedido) {
        Map<String, Object> detalle = new LinkedHashMap<>();
        detalle.put("codigoPedido", codigoPedido);
        detalle.put("causa", colapso.getCausa().name());
        detalle.put("instanteColapsoMs", lineaTiempo.aMilisegundos(colapso.getInstante()));
        detalle.put("horaLimiteMs", lineaTiempo.aMilisegundos(colapso.getHoraLimite()));
        colapso.getVehiculo().ifPresent(vehiculo -> {
            detalle.put("llegadaEstimadaMs", lineaTiempo.aMilisegundos(colapso.getLlegadaEstimada()));
            detalle.put("retrasoMinutos", colapso.getLlegadaEstimada() - colapso.getHoraLimite());
            detalle.put("unidad", codigosFlota.codigo(vehiculo));
        });
        return detalle;
    }

    private void terminar(EstadoEjecucion estadoFinal) {
        reloj.pausar();
        cambiarEstado(estadoFinal);
        evento("EJECUCION_FINALIZADA", "Ejecución " + estadoFinal.name().toLowerCase(),
                lineaTiempo.aMilisegundos(minutoVisible()), Map.of("estado", estadoFinal.name()));
        guardar(relojPared.instant());
        ejecutor.shutdown();
    }

    private void cambiarEstado(EstadoEjecucion nuevo) {
        estado = nuevo;
        guardar(null);
        difundirEstado();
    }

    private void difundirEstado() {
        double minuto = minutoVisible();
        ContextoInstantanea contexto = new ContextoInstantanea(configuracion.id(),
                configuracion.tipoEscenario().name(), estado.name(), pasoSc++, minutoInicial, minuto, lineaTiempo,
                ZonedDateTime.now(relojPared), reloj.getInicioReal(), reloj.getFactorAceleracion(), codigosFlota,
                seguimiento.pedidosActivos(minuto), seguimiento.entregadosRecientes(minuto),
                seguimiento.indicadores(simulacion, minuto),
                Map.copyOf(averiasEnCurso));
        ultimaInstantanea = difusion.difundirEstado(contexto, simulacion);
    }

    private void evento(String tipo, String mensaje, long instanteMs, Map<String, Object> detalle) {
        difusion.difundirEvento(configuracion.id(), tipo, mensaje, instanteMs, detalle);
    }

    private void guardar(Instant finalizadaEn) {
        ResultadoSimulacion resultado = simulacion.getResultado();
        Instant colapso = simulacion.huboColapso()
                ? lineaTiempo.aFecha(resultado.getInstanteColapso()).toInstant() : null;
        repositorio.guardar(new RegistroEjecucion(configuracion.id(), configuracion.tipoEscenario(), estado,
                configuracion.algoritmo().name(), configuracion.fechaInicio(), configuracion.horaInicio(),
                configuracion.dias(), configuracion.factorAceleracion(), configuracion.creadaEn(), finalizadaEn,
                resultado.getTotalEntregas(), resultado.getTotalIncumplimientos(), colapso,
                configuracion.flota().autos(), configuracion.flota().motos(), configuracion.flota().bicicletas()));
    }

    /**
     * Minuto que se muestra: el del reloj, sin pasar el horizonte.
     */
    private double minutoVisible() {
        return Math.min(reloj.minutoActual(), horizonte);
    }

    /**
     * Ejecuta una tarea en el hilo del motor y espera su resultado. Si el motor ya termino, su estado
     * no cambia mas y la tarea se ejecuta en el hilo que llama.
     */
    private <T> T enHiloMotor(Supplier<T> tarea) {
        if (ejecutor.isShutdown()) {
            return tarea.get();
        }
        Future<T> futuro = ejecutor.submit(tarea::get);
        try {
            return futuro.get(ESPERA_MAXIMA_SEGUNDOS, TimeUnit.SECONDS);
        } catch (ExecutionException excepcion) {
            if (excepcion.getCause() instanceof RuntimeException causa) {
                throw causa;
            }
            throw new IllegalStateException("Fallo una tarea del motor " + configuracion.id(), excepcion.getCause());
        } catch (InterruptedException excepcion) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Se interrumpio la espera del motor " + configuracion.id(), excepcion);
        } catch (TimeoutException excepcion) {
            throw new IllegalStateException("El motor " + configuracion.id() + " no respondio a tiempo", excepcion);
        }
    }

    public ConfiguracionMotor getConfiguracion() {
        return configuracion;
    }

    public EstadoEjecucion getEstado() {
        return estado;
    }

    /**
     * @return ultima instantanea difundida; nunca nula despues de {@link #preparar()}
     */
    public MensajeEstadoEjecucion getUltimaInstantanea() {
        return ultimaInstantanea;
    }
}
