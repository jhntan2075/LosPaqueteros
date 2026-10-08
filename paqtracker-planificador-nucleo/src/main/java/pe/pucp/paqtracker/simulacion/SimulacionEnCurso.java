package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Averia;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;
import java.util.ListIterator;
import java.util.Queue;

/**
 * Simulacion que avanza paso a paso. Guarda el estado que cambia de un paso al
 * siguiente (pedidos por llegar, cola, unidades en transito y resultado
 * acumulado) y aplica en cada paso la misma secuencia que el bucle de
 * {@link Orquestador#simular(int, boolean)}: cierre de dia, recarga, averias,
 * liberacion de unidades y de averiadas, refrigerios, ingreso de pedidos,
 * despacho directo de urgentes y planificacion con despacho.
 *
 * Permite que la API conduzca la simulacion con su propio reloj (real o
 * acelerado), que lea el estado entre pasos y que agregue pedidos registrados
 * en vivo. No es segura para hilos: debe usarla un solo hilo.
 */
public final class SimulacionEnCurso {

    private static final long NANOSEGUNDOS_POR_MILISEGUNDO = 1_000_000L;
    private static final int SIN_PASOS = -1;

    private final Orquestador orquestador;
    private final boolean detenerEnColapso;
    private final LinkedList<Pedido> porLlegar;
    private final Queue<Averia> averiasPorOcurrir;
    private final List<Pedido> cola = new ArrayList<>();
    private final List<UnidadEnTransito> enRuta = new ArrayList<>();
    private final List<Orquestador.EventoPosicion> traslados = new ArrayList<>();
    private final List<Orquestador.EventoDisponible> disponibles = new ArrayList<>();
    private final List<Orquestador.EventoRegreso> regresos = new ArrayList<>();
    private final ResultadoSimulacion resultado = new ResultadoSimulacion();
    private int ultimoDiaRecargado;
    private int ultimoDiaObservado;
    private int ultimoInstante = SIN_PASOS;
    private boolean detenida;

    /**
     * @param orquestador      orquestador con la configuracion y las operaciones de cada paso
     * @param pedidos          pedidos del horizonte ordenados por instante de registro
     * @param averias          averias programadas del horizonte ordenadas por instante
     * @param detenerEnColapso verdadero para detenerse en el primer incumplimiento (CU-17)
     */
    SimulacionEnCurso(Orquestador orquestador, List<Pedido> pedidos, List<Averia> averias,
                      boolean detenerEnColapso) {
        this.orquestador = orquestador;
        this.porLlegar = new LinkedList<>(pedidos);
        this.averiasPorOcurrir = new LinkedList<>(averias);
        this.detenerEnColapso = detenerEnColapso;
    }

    /**
     * Avanza el reloj hasta el instante indicado y ejecuta un paso completo.
     *
     * @param instante instante del paso; debe ser mayor que el del paso anterior
     * @return lo ocurrido en el paso
     * @throws IllegalArgumentException si el instante no avanza
     * @throws IllegalStateException    si la simulacion ya se detuvo por colapso
     */
    public ResultadoPaso avanzar(int instante) {
        if (instante <= ultimoInstante) {
            throw new IllegalArgumentException(
                    "El instante " + instante + " no avanza respecto de " + ultimoInstante);
        }
        if (detenida) {
            throw new IllegalStateException("La simulacion se detuvo por colapso en " + ultimoInstante);
        }
        boolean colapsoPrevio = huboColapso();
        ultimoDiaObservado = orquestador.observarCierreDeDia(instante, ultimoDiaObservado, cola, resultado);
        ultimoDiaRecargado = orquestador.recargarAlmacenes(instante, ultimoDiaRecargado);
        List<Tramo> entregas = entregasCompletadas(instante);
        orquestador.procesarAverias(averiasPorOcurrir, instante, enRuta, traslados, disponibles, regresos,
                resultado);
        List<Vehiculo> liberadas = orquestador.liberarUnidades(enRuta, instante);
        orquestador.liberarAveriados(traslados, disponibles, regresos, instante);
        orquestador.actualizarEstadosPorTurno(instante);
        List<Pedido> incorporados = orquestador.incorporarPedidos(porLlegar, cola, instante);
        int despachadasAntes = enRuta.size();
        int unidadesUrgentes = orquestador.despacharUrgentes(cola, enRuta, instante, resultado);
        long tiempoComputo = ResultadoPaso.SIN_PLANIFICACION;
        double fitness = 0.0;
        if (!debeDetenerse()) {
            if (cola.isEmpty() && !orquestador.hayEntregasLiberadas()) {
                resultado.actualizarPico(unidadesUrgentes);
            } else {
                long computoPrevio = resultado.getTiempoComputoTotalMs();
                SolucionRuteo plan = planificar(instante);
                tiempoComputo = resultado.getTiempoComputoTotalMs() - computoPrevio;
                fitness = plan.getFitness();
                orquestador.despachar(plan, cola, enRuta, instante, resultado, unidadesUrgentes);
            }
        }
        detenida = debeDetenerse();
        ultimoInstante = instante;
        List<UnidadEnTransito> despachadas = enRuta.subList(despachadasAntes, enRuta.size());
        return new ResultadoPaso(instante, incorporados, entregas, liberadas, despachadas,
                tiempoComputo, fitness, !colapsoPrevio && huboColapso());
    }

    /**
     * Cierra la simulacion al llegar al horizonte: los pedidos que quedaron sin
     * entregar y cuyo plazo ya vencio cuentan como incumplidos.
     *
     * @param instanteFinal instante final de la simulacion
     */
    public void cerrar(int instanteFinal) {
        orquestador.registrarPedidosPendientes(porLlegar, cola, instanteFinal, resultado);
    }

    /**
     * Agrega un pedido registrado en vivo. Entra a la cola en el primer paso
     * cuyo instante alcance su registro; si ese instante ya paso, en el
     * siguiente paso. Conserva el orden por instante de registro.
     *
     * @param pedido pedido a agregar
     * @throws IllegalArgumentException si el pedido es nulo
     */
    public void agregarPedido(Pedido pedido) {
        if (pedido == null) {
            throw new IllegalArgumentException("El pedido a agregar es nulo");
        }
        ListIterator<Pedido> iterador = porLlegar.listIterator();
        while (iterador.hasNext()) {
            if (iterador.next().getInstanteRegistro() > pedido.getInstanteRegistro()) {
                iterador.previous();
                break;
            }
        }
        iterador.add(pedido);
    }

    /**
     * @return verdadero si ya se declaro el colapso logistico
     */
    public boolean huboColapso() {
        return resultado.getInstanteColapso() >= 0;
    }

    /**
     * @return verdadero si la simulacion se detuvo por colapso y no admite mas pasos
     */
    public boolean estaDetenida() {
        return detenida;
    }

    /**
     * @return instante del ultimo paso ejecutado, o -1 si aun no hubo pasos
     */
    public int getUltimoInstante() {
        return ultimoInstante;
    }

    /**
     * @return pedidos ingresados y aun no despachados, inmodificables
     */
    public List<Pedido> getCola() {
        return Collections.unmodifiableList(cola);
    }

    /**
     * @return cantidad de pedidos cuyo instante de registro aun no llega
     */
    public int getPedidosPorLlegar() {
        return porLlegar.size();
    }

    /**
     * @return unidades en transito, inmodificables
     */
    public List<UnidadEnTransito> getUnidadesEnTransito() {
        return Collections.unmodifiableList(enRuta);
    }

    /**
     * @return flota completa de la simulacion
     */
    public List<Vehiculo> getFlota() {
        return orquestador.getFlota();
    }

    /**
     * @return almacenes de la simulacion, con su stock vigente
     */
    public List<Almacen> getAlmacenes() {
        return orquestador.getAlmacenes();
    }

    /**
     * @return bloqueos programados de la simulacion, de solo lectura
     */
    public List<Bloqueo> getBloqueos() {
        return orquestador.getBloqueos();
    }

    /**
     * @return resultado acumulado; es el mismo objeto que sigue cambiando en cada paso
     */
    public ResultadoSimulacion getResultado() {
        return resultado;
    }

    private boolean debeDetenerse() {
        return detenerEnColapso && huboColapso();
    }

    /**
     * Ordena la cola por hora limite, planifica y registra Ta y el fitness del
     * plan en el resultado.
     *
     * @param instante instante actual del reloj
     * @return plan producido por el planificador
     */
    private SolucionRuteo planificar(int instante) {
        cola.sort(Comparator.comparingInt(Pedido::getHoraLimite));
        long inicioComputo = System.nanoTime();
        SolucionRuteo plan = orquestador.replanificar(cola, instante);
        resultado.registrarTiempoComputo((System.nanoTime() - inicioComputo) / NANOSEGUNDOS_POR_MILISEGUNDO);
        resultado.incrementarReplanificaciones();
        resultado.sumarFitness(plan.getFitness());
        return plan;
    }

    /**
     * Tramos de entrega de las unidades en transito cuya llegada cayo entre el
     * paso anterior (exclusive) y el actual (inclusive). Se calcula antes de
     * liberar las unidades, porque una unidad puede entregar y volver al almacen
     * dentro del mismo intervalo.
     *
     * @param instante instante del paso actual
     * @return tramos de entrega completados en el intervalo
     */
    private List<Tramo> entregasCompletadas(int instante) {
        List<Tramo> completadas = new ArrayList<>();
        for (UnidadEnTransito unidad : enRuta) {
            for (Tramo tramo : unidad.getTramos()) {
                if (tramo.esEntrega() && tramo.getLlegada() > ultimoInstante && tramo.getLlegada() <= instante) {
                    completadas.add(tramo);
                }
            }
        }
        return completadas;
    }
}
