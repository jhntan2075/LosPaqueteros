package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.IndicadoresOperacion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoPedido;
import pe.pucp.paqtracker.simulacion.ResultadoPaso;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.simulacion.UnidadEnTransito;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sigue el estado de cada pedido de una ejecucion a partir de lo que reporta cada paso de la
 * simulacion, y calcula la holgura, el semaforo y los KPI. Lo usa solo el hilo del motor.
 */
public final class SeguimientoPedidos {

    /** Nivel del semaforo de un pedido ya entregado. */
    public static final String NIVEL_CERRADO = "CERRADO";
    private static final String NIVEL_VERDE = "VERDE";
    private static final String NIVEL_AMBAR = "AMBAR";
    private static final String NIVEL_ROJO = "ROJO";

    private final LineaTiempo lineaTiempo;
    private final PropiedadesDominio.Semaforo semaforo;
    private final Map<Integer, Seguimiento> pedidos = new LinkedHashMap<>();
    private int siguienteId;
    private long ultimoTaMs;

    /**
     * @param lineaTiempo relacion entre minutos simulados y fechas
     * @param semaforo    cortes del semaforo
     * @param primerIdLibre primer identificador que no usa ningun pedido cargado
     */
    public SeguimientoPedidos(LineaTiempo lineaTiempo, PropiedadesDominio.Semaforo semaforo, int primerIdLibre) {
        this.lineaTiempo = lineaTiempo;
        this.semaforo = semaforo;
        this.siguienteId = primerIdLibre;
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
        pedidos.putIfAbsent(pedido.getId(), new Seguimiento(pedido));
    }

    /**
     * Actualiza los estados con lo ocurrido en un paso: pedidos que ingresan, partes que se entregan y
     * partes que salen. Un pedido grande puede repartirse en varias unidades; se da por entregado cuando
     * llega su ultima parte.
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
        int aTiempo = 0;
        int conRetraso = 0;
        int pendientes = 0;
        int enTransito = 0;
        long minutosEntrega = 0;
        String peorNivel = NIVEL_VERDE;
        for (Seguimiento seguimiento : pedidos.values()) {
            switch (seguimiento.estado) {
                case ENTREGADO -> {
                    minutosEntrega += seguimiento.entregaReal - seguimiento.pedido.getInstanteRegistro();
                    if (seguimiento.entregaReal <= seguimiento.pedido.getHoraLimite()) {
                        aTiempo++;
                    } else {
                        conRetraso++;
                    }
                }
                case EN_TRANSITO -> enTransito++;
                case REGISTRADO -> pendientes++;
            }
            if (seguimiento.estado != EstadoPedido.ENTREGADO) {
                peorNivel = peor(peorNivel, nivel(seguimiento, minuto));
            }
        }
        int entregados = aTiempo + conRetraso;
        String global = simulacion.huboColapso() ? NIVEL_ROJO : peorNivel;
        return new IndicadoresOperacion(pedidos.size(), aTiempo, conRetraso, pendientes, enTransito,
                contarUnidades(simulacion, EstadoVehiculo.EN_RUTA),
                contarUnidades(simulacion, EstadoVehiculo.DISPONIBLE_EN_ALMACEN), 0,
                entregados == 0 ? 0.0 : (double) minutosEntrega / entregados, ultimoTaMs,
                simulacion.getResultado().getReplanificaciones(), simulacion.getResultado().getDistanciaTotal(),
                global);
    }

    private boolean registrarLlegada(Tramo tramo) {
        Seguimiento seguimiento = pedidos.get(tramo.getIdPedido());
        if (seguimiento == null || seguimiento.estado == EstadoPedido.ENTREGADO) {
            return false;
        }
        seguimiento.partesEnCamino--;
        if (seguimiento.partesEnCamino > 0) {
            return false;
        }
        seguimiento.estado = EstadoPedido.ENTREGADO;
        seguimiento.entregaReal = tramo.getLlegada();
        return true;
    }

    private void registrarSalida(UnidadEnTransito unidad, int instante, List<Tramo> completados) {
        String codigo = NomenclaturaOperacion.codigoUnidad(unidad.getVehiculo());
        for (Tramo tramo : unidad.getTramos()) {
            Seguimiento seguimiento = tramo.esEntrega() ? pedidos.get(tramo.getIdPedido()) : null;
            if (seguimiento == null) {
                continue;
            }
            seguimiento.estado = EstadoPedido.EN_TRANSITO;
            seguimiento.unidad = codigo;
            seguimiento.eta = Math.max(seguimiento.eta, tramo.getLlegada());
            seguimiento.partesEnCamino++;
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
        return new PedidoEnMapa(pedido.getId(), NomenclaturaOperacion.codigoPedido(pedido.getId()),
                new Coordenada(pedido.getDestino().getX(), pedido.getDestino().getY()), pedido.getCantidad(),
                lineaTiempo.aMilisegundos(pedido.getInstanteRegistro()),
                lineaTiempo.aMilisegundos(pedido.getHoraLimite()), eta, seguimiento.estado.name(), nivel,
                seguimiento.unidad);
    }

    /**
     * Nivel del semaforo: holgura restante como fraccion del plazo del pedido. Si ya salio se mide con
     * su llegada estimada; si espera, con el reloj actual.
     */
    private String nivel(Seguimiento seguimiento, double minuto) {
        double referencia = seguimiento.estado == EstadoPedido.EN_TRANSITO ? seguimiento.eta : minuto;
        double holgura = seguimiento.pedido.getHoraLimite() - referencia;
        double fraccion = holgura / seguimiento.pedido.getPlazo();
        if (fraccion < semaforo.fraccionRojo()) {
            return NIVEL_ROJO;
        }
        return fraccion < semaforo.fraccionAmbar() ? NIVEL_AMBAR : NIVEL_VERDE;
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
    private static final class Seguimiento {
        private final Pedido pedido;
        private EstadoPedido estado = EstadoPedido.REGISTRADO;
        private String unidad;
        private int eta;
        private int entregaReal;
        private int partesEnCamino;

        private Seguimiento(Pedido pedido) {
            this.pedido = pedido;
        }
    }
}
