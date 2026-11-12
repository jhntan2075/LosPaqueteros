package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteRangosSemaforo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.FraccionEnvio;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.IndicadoresOperacion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DetallePedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.HitoPedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoAvance;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoPedido;
import pe.pucp.paqtracker.simulacion.AveriaAplicada;
import pe.pucp.paqtracker.simulacion.ResultadoPaso;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.simulacion.Trasbordo;
import pe.pucp.paqtracker.simulacion.UnidadEnTransito;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Sigue el estado de cada pedido de una ejecucion a partir de lo que reporta cada paso de la
 * simulacion: estado, unidad, llegada estimada, fracciones por unidad, trazabilidad, holgura, semaforo y
 * KPI. Lo usa solo el hilo del motor.
 *
 * <p>Es una proyeccion (modelo de lectura) de los {@link ResultadoPaso}: el panel del visualizador
 * consulta aqui lo que sale, va en camino o se entrego desde cada almacen sin volver al nucleo.
 */
public final class SeguimientoPedidos {

    /** Nivel del semaforo de un pedido ya entregado. */
    public static final String NIVEL_CERRADO = "CERRADO";
    private static final String NIVEL_VERDE = "VERDE";
    private static final String NIVEL_AMBAR = "AMBAR";
    private static final String NIVEL_ROJO = "ROJO";
    private static final double PORCENTAJE_TOTAL = 100.0;
    private static final int MINUTOS_POR_HORA = 60;
    /** Ventana de "entregados recientemente" que acompana a cada instantanea: las ultimas 4 h simuladas. */
    public static final int VENTANA_RECIENTE_MINUTOS = 4 * MINUTOS_POR_HORA;

    private final LineaTiempo lineaTiempo;
    private final FuenteRangosSemaforo semaforo;
    private final CodigosFlota codigosFlota;
    private final Map<Integer, Seguimiento> pedidos = new LinkedHashMap<>();
    /** Paquetes de cada pedido entregados antes de un reinicio del dia a dia. */
    private final Map<Integer, Integer> entregadasPrevias;
    /** Pedidos cuyo avance cambio desde la ultima vez que se tomaron los cambios. */
    private final Set<Integer> cambiados = new LinkedHashSet<>();
    private int siguienteId;
    private long ultimoTaMs;

    /**
     * @param lineaTiempo   relacion entre minutos simulados y fechas
     * @param semaforo      rangos del semaforo vigentes; se consultan en cada calculo de nivel
     * @param codigosFlota  codigos visibles de las unidades de la ejecucion
     * @param primerIdLibre primer identificador que no usa ningun pedido cargado
     */
    public SeguimientoPedidos(LineaTiempo lineaTiempo, FuenteRangosSemaforo semaforo,
                              CodigosFlota codigosFlota, int primerIdLibre) {
        this(lineaTiempo, semaforo, codigosFlota, primerIdLibre, Map.of());
    }

    /**
     * @param lineaTiempo       relacion entre minutos simulados y fechas
     * @param semaforo          rangos del semaforo vigentes; se consultan en cada calculo de nivel
     * @param codigosFlota      codigos visibles de las unidades de la ejecucion
     * @param primerIdLibre     primer identificador que no usa ningun pedido cargado
     * @param entregadasPrevias paquetes de cada pedido entregados antes de un reinicio del dia a dia
     */
    public SeguimientoPedidos(LineaTiempo lineaTiempo, FuenteRangosSemaforo semaforo,
                              CodigosFlota codigosFlota, int primerIdLibre, Map<Integer, Integer> entregadasPrevias) {
        this.lineaTiempo = lineaTiempo;
        this.semaforo = semaforo;
        this.codigosFlota = codigosFlota;
        this.siguienteId = primerIdLibre;
        this.entregadasPrevias = Map.copyOf(entregadasPrevias);
    }

    /**
     * @return identificador para un pedido nuevo registrado en vivo
     */
    public int reservarId() {
        return siguienteId++;
    }

    /**
     * Registra un pedido que ingreso al sistema. Es idempotente: el pedido registrado en vivo vuelve a
     * aparecer como incorporado en el paso en que entra a la cola.
     *
     * @param pedido pedido registrado
     */
    public void registrar(Pedido pedido) {
        if (!pedidos.containsKey(pedido.getId())) {
            Seguimiento seguimiento = new Seguimiento(pedido);
            seguimiento.hito(pedido.getInstanteRegistro(), "Registrado", pedido.getCantidad() + " paquetes a "
                    + pedido.getDestino() + ", plazo " + pedido.getPlazo() / MINUTOS_POR_HORA + " h");
            pedidos.put(pedido.getId(), seguimiento);
            cambiados.add(pedido.getId());
        }
    }

    /**
     * Avance de los pedidos que cambiaron desde la llamada anterior, para guardarlo (solo el dia a dia lo
     * usa). Vacia la lista de cambios.
     *
     * @return un avance por pedido cambiado, con lo entregado antes de un reinicio incluido
     */
    public List<AvancePedido> tomarCambios() {
        List<AvancePedido> avances = new ArrayList<>();
        for (Integer id : cambiados) {
            Seguimiento seguimiento = pedidos.get(id);
            if (seguimiento != null) {
                avances.add(seguimiento.avance());
            }
        }
        cambiados.clear();
        return avances;
    }

    /**
     * Actualiza los estados con lo ocurrido en un paso: pedidos que ingresan, partes que se entregan,
     * partes que una averia libera o retrasa y partes que salen. Un pedido grande puede repartirse en
     * varias unidades; se da por entregado cuando llega su ultima parte.
     *
     * @param paso resultado del paso
     * @return tramos de entrega que completaron un pedido en este paso
     */
    public List<Tramo> aplicar(ResultadoPaso paso) {
        paso.getPedidosIncorporados().forEach(this::registrar);
        List<Tramo> completados = new ArrayList<>();
        for (Tramo tramo : paso.getEntregasCompletadas()) {
            if (registrarLlegada(tramo)) {
                completados.add(tramo);
            }
        }
        paso.getAveriasAplicadas().forEach(this::registrarAveria);
        for (UnidadEnTransito unidad : paso.getUnidadesDespachadas()) {
            registrarSalida(unidad, paso.getInstante(), completados);
        }
        if (paso.huboPlanificacion()) {
            ultimoTaMs = paso.getTiempoComputoMs();
        }
        return completados;
    }

    /**
     * @param minuto minuto simulado actual
     * @return pedidos aun no entregados, con su nivel de holgura
     */
    public List<PedidoEnMapa> pedidosActivos(double minuto) {
        return pedidos.values().stream().filter(s -> s.estado != EstadoPedido.ENTREGADO)
                .map(s -> aPedidoEnMapa(s, minuto)).toList();
    }

    /**
     * Pedidos entregados dentro de la ventana {@link #VENTANA_RECIENTE_MINUTOS} que termina en el minuto
     * actual, con su borde inferior incluido; los mas recientes primero.
     *
     * @param minuto minuto simulado actual
     * @return pedidos entregados en las ultimas 4 h simuladas
     */
    public List<PedidoEnMapa> entregadosRecientes(double minuto) {
        double desde = minuto - VENTANA_RECIENTE_MINUTOS;
        return pedidos.values().stream()
                .filter(s -> s.estado == EstadoPedido.ENTREGADO && s.entregaReal >= desde && s.entregaReal <= minuto)
                .sorted(Comparator.comparingInt((Seguimiento s) -> s.entregaReal).reversed())
                .map(s -> aPedidoEnMapa(s, minuto)).toList();
    }

    /**
     * @param minuto minuto simulado actual
     * @return todos los pedidos registrados, incluidos los entregados
     */
    public List<PedidoEnMapa> todos(double minuto) {
        return pedidos.values().stream().map(s -> aPedidoEnMapa(s, minuto)).toList();
    }

    /**
     * @param idPedido identificador del pedido
     * @param minuto   minuto simulado actual
     * @return pedido con su estado, o null si no esta registrado
     */
    public PedidoEnMapa pedido(int idPedido, double minuto) {
        Seguimiento seguimiento = pedidos.get(idPedido);
        return seguimiento == null ? null : aPedidoEnMapa(seguimiento, minuto);
    }

    /**
     * @param idPedido identificador del pedido
     * @param minuto   minuto simulado actual
     * @return pedido con su trazabilidad, o vacio si no esta registrado
     */
    public Optional<DetallePedido> detalle(int idPedido, double minuto) {
        Seguimiento seguimiento = pedidos.get(idPedido);
        if (seguimiento == null) {
            return Optional.empty();
        }
        return Optional.of(new DetallePedido(aPedidoEnMapa(seguimiento, minuto), List.copyOf(seguimiento.hitos)));
    }

    /**
     * @param idPedido identificador de un pedido registrado
     * @return su hora limite, en minutos simulados
     * @throws IllegalArgumentException si el pedido no esta registrado
     */
    public int horaLimite(int idPedido) {
        Seguimiento seguimiento = pedidos.get(idPedido);
        if (seguimiento == null) {
            throw new IllegalArgumentException("Pedido no registrado: " + idPedido);
        }
        return seguimiento.pedido.getHoraLimite();
    }

    /**
     * @param simulacion simulacion de la ejecucion, para el estado de la flota y los acumulados
     * @param minuto     minuto simulado actual
     * @return KPI y semaforo global
     */
    public IndicadoresOperacion indicadores(SimulacionEnCurso simulacion, double minuto) {
        int[] conteo = new int[EstadoPedido.values().length];
        int aTiempo = 0;
        long minutosEntrega = 0;
        String peorNivel = NIVEL_VERDE;
        for (Seguimiento seguimiento : pedidos.values()) {
            conteo[seguimiento.estado.ordinal()]++;
            if (seguimiento.estado == EstadoPedido.ENTREGADO) {
                minutosEntrega += seguimiento.entregaReal - seguimiento.pedido.getInstanteRegistro();
                aTiempo += seguimiento.entregaReal <= seguimiento.pedido.getHoraLimite() ? 1 : 0;
            } else {
                peorNivel = peor(peorNivel, nivel(seguimiento, minuto));
            }
        }
        int entregados = conteo[EstadoPedido.ENTREGADO.ordinal()];
        return new IndicadoresOperacion(pedidos.size(), aTiempo, entregados - aTiempo,
                conteo[EstadoPedido.REGISTRADO.ordinal()], conteo[EstadoPedido.EN_TRANSITO.ordinal()],
                contarUnidades(simulacion, EstadoVehiculo.EN_RUTA),
                contarUnidades(simulacion, EstadoVehiculo.DISPONIBLE_EN_ALMACEN),
                contarUnidades(simulacion, EstadoVehiculo.AVERIADA),
                entregados == 0 ? 0.0 : (double) minutosEntrega / entregados, ultimoTaMs,
                simulacion.getResultado().getReplanificaciones(), simulacion.getResultado().getDistanciaTotal(),
                entregados == 0 ? PORCENTAJE_TOTAL : PORCENTAJE_TOTAL * aTiempo / entregados,
                simulacion.huboColapso() ? NIVEL_ROJO : peorNivel);
    }

    private boolean registrarLlegada(Tramo tramo) {
        Seguimiento seguimiento = pedidos.get(tramo.getIdPedido());
        if (seguimiento == null || seguimiento.estado == EstadoPedido.ENTREGADO) {
            return false;
        }
        seguimiento.partesEnCamino--;
        seguimiento.entregarFraccion(tramo);
        cambiados.add(tramo.getIdPedido());
        if (seguimiento.partesEnCamino > 0) {
            seguimiento.hito(tramo.getLlegada(), "Entrega parcial", tramo.getCantidad() + " paquetes entregados");
            return false;
        }
        seguimiento.estado = EstadoPedido.ENTREGADO;
        seguimiento.entregaReal = tramo.getLlegada();
        int holgura = seguimiento.pedido.getHoraLimite() - tramo.getLlegada();
        seguimiento.hito(tramo.getLlegada(), holgura >= 0 ? "Entregado a tiempo" : "Entregado con retraso",
                holgura >= 0 ? "Holgura de " + holgura + " min" : "Retraso de " + (-holgura) + " min");
        return true;
    }

    /**
     * Refleja una averia en los pedidos que llevaba la unidad: las partes liberadas (vuelven a la cola) y las
     * respaldadas (salen en otra unidad desde un almacen, que se registra como despacho en este mismo paso)
     * dejan de estar en camino en la averiada y, si era la ultima, el pedido vuelve a esperar despacho; las
     * partes que siguen a bordo (tipo 1) toman su nueva llegada estimada; las trasvasadas pasan a su receptora.
     */
    private void registrarAveria(AveriaAplicada averia) {
        String codigo = codigosFlota.codigo(averia.vehiculo());
        int instante = averia.averia().getInstante();
        String causa = "la unidad " + codigo + " tuvo una avería tipo " + averia.averia().getTipo().getNumero();
        for (Entrega entrega : averia.entregasLiberadas()) {
            retirarParte(entrega, codigo, instante, "Liberado por avería", entrega.getCantidad()
                    + " paquetes vuelven a planificarse en el siguiente ciclo: " + causa);
        }
        for (Entrega entrega : averia.entregasRespaldadas()) {
            retirarParte(entrega, codigo, instante, "Respaldo por avería", entrega.getCantidad()
                    + " paquetes salen en otra unidad desde un almacén: " + causa);
        }
        if (averia.transitoReanudado() != null) {
            registrarRetraso(averia.transitoReanudado(), instante, codigo);
        }
        for (Trasbordo trasbordo : averia.trasbordos()) {
            registrarTrasbordo(trasbordo, instante, codigo);
        }
    }

    private void registrarRetraso(UnidadEnTransito reanudado, int instante, String codigo) {
        for (Tramo tramo : reanudado.getTramos()) {
            Seguimiento seguimiento = tramo.esEntrega() && tramo.getLlegada() > instante
                    ? pedidos.get(tramo.getIdPedido()) : null;
            if (seguimiento == null || seguimiento.estado == EstadoPedido.ENTREGADO) {
                continue;
            }
            seguimiento.actualizarEta(tramo.getLlegada());
            seguimiento.fraccionActiva(codigo).ifPresent(fraccion -> fraccion.llegada = tramo.getLlegada());
            seguimiento.hito(instante, "Retrasado por avería", "La unidad " + codigo
                    + " se detuvo por una avería tipo 1 con la carga a bordo, nueva llegada estimada "
                    + lineaTiempo.formatear(tramo.getLlegada()));
        }
    }

    /**
     * Una parte que la averiada deja de llevar: sale del conteo en camino, su fraccion queda liberada y, si
     * era la ultima, el pedido espera.
     */
    private void retirarParte(Entrega entrega, String codigoUnidad, int instante, String titulo, String detalle) {
        Seguimiento seguimiento = pedidos.get(entrega.getIdPedido());
        if (seguimiento == null || seguimiento.estado == EstadoPedido.ENTREGADO) {
            return;
        }
        seguimiento.fraccionActiva(codigoUnidad).ifPresent(fraccion -> fraccion.estado = EstadoFraccion.LIBERADA);
        cambiados.add(entrega.getIdPedido());
        seguimiento.partesEnCamino = Math.max(0, seguimiento.partesEnCamino - 1);
        if (seguimiento.partesEnCamino == 0) {
            seguimiento.estado = EstadoPedido.REGISTRADO;
            seguimiento.unidad = null;
            seguimiento.eta = 0;
        }
        seguimiento.hito(instante, titulo, detalle);
    }

    /**
     * La parte trasvasada sigue en camino, ahora en la receptora y con su nueva llegada; los pedidos propios de
     * la receptora toman la llegada que les deja el desvio.
     */
    private void registrarTrasbordo(Trasbordo trasbordo, int instante, String codigoAveriada) {
        String receptora = codigosFlota.codigo(trasbordo.receptora().getVehiculo());
        Set<Integer> trasvasados = trasbordo.entregas().stream().map(Entrega::getIdPedido)
                .collect(Collectors.toSet());
        for (Tramo tramo : trasbordo.receptora().getTramos()) {
            Seguimiento seguimiento = tramo.esEntrega() && tramo.getLlegada() > instante
                    ? pedidos.get(tramo.getIdPedido()) : null;
            if (seguimiento == null || seguimiento.estado == EstadoPedido.ENTREGADO) {
                continue;
            }
            seguimiento.actualizarEta(tramo.getLlegada());
            if (!trasvasados.contains(tramo.getIdPedido())) {
                seguimiento.fraccionActiva(receptora).ifPresent(fraccion -> fraccion.llegada = tramo.getLlegada());
                seguimiento.hito(instante, "Desvío por trasvase", "La unidad " + receptora + " se desvía a recoger "
                        + "carga de " + codigoAveriada + "; nueva llegada estimada "
                        + lineaTiempo.formatear(tramo.getLlegada()));
                continue;
            }
            seguimiento.unidad = receptora;
            // La fraccion conserva su codigo y su origen: cambia de unidad y de llegada.
            seguimiento.fraccionActiva(codigoAveriada).or(() -> seguimiento.fraccionActiva(receptora))
                    .ifPresent(fraccion -> {
                        fraccion.unidad = receptora;
                        fraccion.llegada = tramo.getLlegada();
                    });
            seguimiento.hito(instante, "Trasvasado", tramo.getCantidad() + " paquetes pasan de " + codigoAveriada
                    + " (averiada) a " + receptora + ", que los recoge a las "
                    + lineaTiempo.formatear(trasbordo.getRecojo()) + "; nueva llegada estimada "
                    + lineaTiempo.formatear(tramo.getLlegada()));
        }
    }

    private void registrarSalida(UnidadEnTransito unidad, int instante, List<Tramo> completados) {
        String codigo = codigosFlota.codigo(unidad.getVehiculo());
        for (Tramo tramo : unidad.getTramos()) {
            Seguimiento seguimiento = tramo.esEntrega() ? pedidos.get(tramo.getIdPedido()) : null;
            if (seguimiento == null) {
                continue;
            }
            seguimiento.estado = EstadoPedido.EN_TRANSITO;
            cambiados.add(tramo.getIdPedido());
            seguimiento.unidad = codigo;
            seguimiento.eta = Math.max(seguimiento.eta, tramo.getLlegada());
            seguimiento.partesEnCamino++;
            seguimiento.fracciones.add(new Fraccion(seguimiento.fracciones.size() + 1, codigo,
                    NomenclaturaOperacion.codigoAlmacen(unidad.getOrigen()), tramo.getCantidad(), unidad.getSalida(),
                    tramo.getLlegada()));
            seguimiento.hito(instante, "Despachado", tramo.getCantidad() + " paquetes en " + codigo + " desde "
                    + NomenclaturaOperacion.nombreAlmacen(unidad.getOrigen()) + ", llegada estimada "
                    + lineaTiempo.formatear(tramo.getLlegada()));
            // Una entrega de distancia cero llega en el mismo instante en que sale: el nucleo no la
            // reporta en el paso siguiente, asi que se cierra aqui.
            if (tramo.getLlegada() <= instante && registrarLlegada(tramo)) {
                completados.add(tramo);
            }
        }
    }

    private PedidoEnMapa aPedidoEnMapa(Seguimiento seguimiento, double minuto) {
        Pedido pedido = seguimiento.pedido;
        Long eta = seguimiento.estado == EstadoPedido.REGISTRADO ? null
                : lineaTiempo.aMilisegundos(seguimiento.estado == EstadoPedido.ENTREGADO
                        ? seguimiento.entregaReal : seguimiento.eta);
        String nivel = seguimiento.estado == EstadoPedido.ENTREGADO ? NIVEL_CERRADO : nivel(seguimiento, minuto);
        Long entrega = seguimiento.estado == EstadoPedido.ENTREGADO
                ? lineaTiempo.aMilisegundos(seguimiento.entregaReal) : null;
        List<FraccionEnvio> fracciones = seguimiento.fracciones.stream()
                .map(fraccion -> aFraccionEnvio(fraccion, minuto)).toList();
        return new PedidoEnMapa(pedido.getId(), NomenclaturaOperacion.codigoPedido(pedido.getId()),
                new Coordenada(pedido.getDestino().getX(), pedido.getDestino().getY()), pedido.getCantidad(),
                lineaTiempo.aMilisegundos(pedido.getInstanteRegistro()),
                lineaTiempo.aMilisegundos(pedido.getHoraLimite()), eta, seguimiento.estado.name(), nivel,
                seguimiento.unidad, pedido.getCliente(), entrega, fracciones);
    }

    /** Una fraccion activa esta PROGRAMADA mientras su unidad no sale del almacen y EN_CAMINO despues. */
    private FraccionEnvio aFraccionEnvio(Fraccion fraccion, double minuto) {
        String estado = switch (fraccion.estado) {
            case ACTIVA -> fraccion.salida > minuto ? "PROGRAMADA" : "EN_CAMINO";
            case ENTREGADA -> "ENTREGADA";
            case LIBERADA -> "LIBERADA";
        };
        return new FraccionEnvio(fraccion.indice, fraccion.unidad, fraccion.almacenOrigen, fraccion.cantidad,
                lineaTiempo.aMilisegundos(fraccion.salida), lineaTiempo.aMilisegundos(fraccion.llegada), estado);
    }

    /**
     * Nivel del semaforo: holgura restante como fraccion del plazo del pedido. Si ya salio se mide con
     * su llegada estimada; si espera, con el reloj actual.
     */
    private String nivel(Seguimiento seguimiento, double minuto) {
        double referencia = seguimiento.estado == EstadoPedido.EN_TRANSITO ? seguimiento.eta : minuto;
        double holgura = seguimiento.pedido.getHoraLimite() - referencia;
        return semaforo.vigentes().holgura().nivel(holgura / seguimiento.pedido.getPlazo());
    }

    private static String peor(String actual, String candidato) {
        if (NIVEL_ROJO.equals(actual) || NIVEL_ROJO.equals(candidato)) {
            return NIVEL_ROJO;
        }
        return NIVEL_AMBAR.equals(actual) || NIVEL_AMBAR.equals(candidato) ? NIVEL_AMBAR : NIVEL_VERDE;
    }

    private static int contarUnidades(SimulacionEnCurso simulacion, EstadoVehiculo estado) {
        int cantidad = 0;
        for (Vehiculo vehiculo : simulacion.getFlota()) {
            if (vehiculo.getEstado() == estado) {
                cantidad++;
            }
        }
        return cantidad;
    }

    /** Estado mutable de un pedido dentro de la ejecucion. */
    private final class Seguimiento {
        private final Pedido pedido;
        private final List<HitoPedido> hitos = new ArrayList<>();
        private EstadoPedido estado = EstadoPedido.REGISTRADO;
        private String unidad;
        private int eta;
        private int entregaReal;
        private int partesEnCamino;
        private final List<Fraccion> fracciones = new ArrayList<>();

        private Seguimiento(Pedido pedido) {
            this.pedido = pedido;
        }

        /** Primera fraccion aun sin entregar ni liberar que lleva la unidad. */
        private Optional<Fraccion> fraccionActiva(String codigoUnidad) {
            return fracciones.stream()
                    .filter(f -> f.estado == EstadoFraccion.ACTIVA && f.unidad.equals(codigoUnidad)).findFirst();
        }

        /**
         * Marca como entregada la fraccion de un tramo de entrega. El nucleo no dice que unidad completo el
         * tramo: se busca la fraccion activa con la misma llegada y cantidad; si no hay, la de igual cantidad
         * que llega antes, y si tampoco, la primera activa.
         */
        private void entregarFraccion(Tramo tramo) {
            fracciones.stream().filter(f -> f.estado == EstadoFraccion.ACTIVA
                            && f.llegada == tramo.getLlegada() && f.cantidad == tramo.getCantidad()).findFirst()
                    .or(() -> fracciones.stream()
                            .filter(f -> f.estado == EstadoFraccion.ACTIVA && f.cantidad == tramo.getCantidad())
                            .min(Comparator.comparingInt((Fraccion f) -> f.llegada)))
                    .or(() -> fracciones.stream().filter(f -> f.estado == EstadoFraccion.ACTIVA).findFirst())
                    .ifPresent(fraccion -> {
                        fraccion.estado = EstadoFraccion.ENTREGADA;
                        fraccion.llegada = tramo.getLlegada();
                    });
        }

        /** Avance para guardar: lo entregado suma lo de antes de un reinicio. */
        private AvancePedido avance() {
            int entregada = entregadasPrevias.getOrDefault(pedido.getId(), 0) + fracciones.stream()
                    .filter(f -> f.estado == EstadoFraccion.ENTREGADA).mapToInt(f -> f.cantidad).sum();
            if (estado != EstadoPedido.ENTREGADO) {
                EstadoAvance avance = estado == EstadoPedido.EN_TRANSITO ? EstadoAvance.EN_TRANSITO
                        : EstadoAvance.REGISTRADO;
                return new AvancePedido(pedido.getId(), avance, entregada, null, null);
            }
            return new AvancePedido(pedido.getId(), EstadoAvance.ENTREGADO, entregada,
                    lineaTiempo.aFecha(entregaReal).toInstant(), Math.max(0, entregaReal - pedido.getHoraLimite()));
        }

        private void hito(int minuto, String titulo, String detalle) {
            hitos.add(new HitoPedido(lineaTiempo.aMilisegundos(minuto), titulo, detalle));
        }

        /**
         * Una averia cambia la llegada de una parte en camino. Con una sola parte, esa es la llegada del
         * pedido aunque ahora sea antes (un trasbordo puede adelantarla); con varias, se conserva la mayor.
         */
        private void actualizarEta(int llegada) {
            eta = partesEnCamino <= 1 ? llegada : Math.max(eta, llegada);
        }
    }

    /** Estado interno de una fraccion; PROGRAMADA y EN_CAMINO se distinguen al difundir, con el reloj. */
    private enum EstadoFraccion { ACTIVA, ENTREGADA, LIBERADA }

    /** Parte de un pedido en una unidad. Cambia de unidad en un trasvase y de llegada ante una averia. */
    private static final class Fraccion {
        private final int indice;
        private final String almacenOrigen;
        private final int cantidad;
        private final int salida;
        private String unidad;
        private int llegada;
        private EstadoFraccion estado = EstadoFraccion.ACTIVA;

        private Fraccion(int indice, String unidad, String almacenOrigen, int cantidad, int salida, int llegada) {
            this.indice = indice;
            this.unidad = unidad;
            this.almacenOrigen = almacenOrigen;
            this.cantidad = cantidad;
            this.salida = salida;
            this.llegada = llegada;
        }
    }
}
