package pe.pucp.paqtracker.servicio;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.planificador.comun.Fragmentador;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import pe.pucp.paqtracker.util.Malla;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Set;

/**
 * Orquestador dinamico del planificador. Simula la operacion en el tiempo: el
 * reloj avanza en pasos de Sa minutos y en cada paso el planificador corre solo
 * sobre los pedidos que ya llegaron a la cola y las unidades libres. Las
 * unidades salen de inmediato al planificarse y vuelven a estar libres cuando
 * terminan su ruta, en el almacen de destino.
 *
 * Los bloqueos son programados: se consultan via la malla al calcular tiempos.
 * El metodo replanificar es el punto de disparo; hoy lo invoca solo el reloj,
 * pero queda preparado para que una averia lo dispare en el futuro sin
 * reescribir el resto (orquestador hibrido).
 */
public final class Orquestador {

    private final List<Almacen> almacenes;
    private final List<Vehiculo> flota;
    private final List<Pedido> pedidos;
    private final Malla malla;
    private final int saMinutos;
    private final int tiempoServicio;
    private final int plazoMaximo;
    private final long semilla;

    /**
     * @param almacenes      almacenes del sistema
     * @param flota          flota completa
     * @param pedidos        pedidos del horizonte, con registro absoluto
     * @param malla          malla con bloqueos programados
     * @param saMinutos      paso del reloj en minutos
     * @param tiempoServicio acondicionamiento por entrega en minutos
     * @param plazoMaximo    plazo maximo del catalogo, para ponderar urgencia
     * @param semilla        semilla base para reproducibilidad
     */
    public Orquestador(List<Almacen> almacenes, List<Vehiculo> flota, List<Pedido> pedidos,
                       Malla malla, int saMinutos, int tiempoServicio, int plazoMaximo, long semilla) {
        this.almacenes = almacenes;
        this.flota = flota;
        this.pedidos = new ArrayList<>(pedidos);
        this.pedidos.sort(Comparator.comparingInt(Pedido::getInstanteRegistro));
        this.malla = malla;
        this.saMinutos = saMinutos;
        this.tiempoServicio = tiempoServicio;
        this.plazoMaximo = plazoMaximo;
        this.semilla = semilla;
    }

    /**
     * Corre la simulacion desde el instante cero hasta el horizonte.
     *
     * @param horizonteMinutos instante final de la simulacion en minutos
     * @return resultado agregado de la simulacion
     */
    public ResultadoSimulacion simular(int horizonteMinutos) {
        ResultadoSimulacion resultado = new ResultadoSimulacion();
        Queue<Pedido> porLlegar = new LinkedList<>(pedidos);
        List<Pedido> cola = new ArrayList<>();
        List<UnidadEnTransito> enRuta = new ArrayList<>();
        for (int instante = 0; instante <= horizonteMinutos; instante += saMinutos) {
            liberarUnidades(enRuta, instante);
            incorporarPedidos(porLlegar, cola, instante);
            if (cola.isEmpty()) {
                continue;
            }
            cola.sort(Comparator.comparingInt(Pedido::getHoraLimite));
            SolucionRuteo plan = replanificar(cola, instante);
            resultado.incrementarReplanificaciones();
            despachar(plan, cola, enRuta, instante, resultado);
        }
        registrarPedidosPendientes(porLlegar, cola, horizonteMinutos, resultado);
        return resultado;
    }

    /**
     * Registra como incumplidos los pedidos que terminaron sin ser entregados
     * y cuyo plazo ya vencio al finalizar la simulacion.
     *
     * @param porLlegar pedidos que aun no ingresaron a la cola
     * @param cola pedidos ingresados pero no despachados
     * @param instanteFinal instante final de la simulacion
     * @param resultado resultado agregado a actualizar
     */
    private void registrarPedidosPendientes(Queue<Pedido> porLlegar, List<Pedido> cola,
                                             int instanteFinal, ResultadoSimulacion resultado) {
        List<Pedido> pendientes = new ArrayList<>(porLlegar);
        pendientes.addAll(cola);
        for (Pedido pedido : pendientes) {
            if (pedido.getHoraLimite() <= instanteFinal) {
                resultado.sumarIncumplimientos(1);
                resultado.registrarColapso(pedido.getHoraLimite());
                resultado.getDetalleIncumplimientos().add(String.format(
                        "pedido %d: hora limite %d, no fue entregado",
                        pedido.getId(), pedido.getHoraLimite()));
            }
        }
    }

    /**
     * Libera las unidades cuyo instante de retorno ya paso, dejandolas
     * disponibles en su almacen de destino.
     *
     * @param enRuta   unidades en transito
     * @param instante instante actual del reloj
     */
    private void liberarUnidades(List<UnidadEnTransito> enRuta, int instante) {
        Iterator<UnidadEnTransito> iterador = enRuta.iterator();
        while (iterador.hasNext()) {
            UnidadEnTransito unidad = iterador.next();
            if (unidad.getLibreEn() <= instante) {
                unidad.getVehiculo().setDisponible(true);
                unidad.getVehiculo().setPosicion(unidad.getDestino());
                iterador.remove();
            }
        }
    }

    /**
     * Incorpora a la cola los pedidos cuyo instante de registro ya paso.
     *
     * @param porLlegar pedidos aun no registrados
     * @param cola      cola de pedidos por planificar
     * @param instante  instante actual del reloj
     */
    private void incorporarPedidos(Queue<Pedido> porLlegar, List<Pedido> cola, int instante) {
        while (!porLlegar.isEmpty() && porLlegar.peek().getInstanteRegistro() <= instante) {
            cola.add(porLlegar.poll());
        }
    }

    /**
     * Punto de disparo de la planificacion. Preparado para ser invocado tambien
     * por una averia en el futuro.
     *
     * @param cola     cola de pedidos por planificar
     * @param instante instante actual del reloj
     * @return plan de rutas producido por el planificador
     */
    public SolucionRuteo replanificar(List<Pedido> cola, int instante) {
        EscenarioOperativo escenario = construirEscenario(cola, instante);
        PlanificadorGA planificador = new PlanificadorGA(semilla + instante);
        return planificador.planificar(escenario);
    }

    /**
     * Despacha las rutas del plan: cada unidad sale de inmediato y queda en
     * transito hasta que termina su ruta.
     *
     * @param plan      plan a despachar
     * @param cola      cola de pedidos (se depura la parte despachada)
     * @param enRuta    unidades en transito (se agregan las despachadas)
     * @param instante  instante actual del reloj
     * @param resultado resultado agregado a actualizar
     */
    private void despachar(SolucionRuteo plan, List<Pedido> cola, List<UnidadEnTransito> enRuta,
                           int instante, ResultadoSimulacion resultado) {
        Set<Integer> despachados = new HashSet<>();
        int enUso = 0;
        EscenarioOperativo escenario = construirEscenario(cola, instante);
        for (Ruta ruta : plan.getRutas()) {
            if (ruta.getSecuencia().isEmpty()) {
                continue;
            }
            enUso++;
            resultado.registrarUso(ruta.getVehiculo().getTipo().name());
            int[] recorrido = CalculadoraTiempos.recorrer(escenario, ruta, instante);
            resultado.sumarDistancia(recorrido[CalculadoraTiempos.INDICE_DISTANCIA]);
            resultado.sumarIncumplimientos(recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS]);
            if (recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS] > 0) {
                resultado.registrarColapso(instante);
                registrarDetalle(escenario, ruta, instante, resultado);
            }
            resultado.sumarEntregas(ruta.getSecuencia().size());
            for (Entrega entrega : ruta.getSecuencia()) {
                despachados.add(entrega.getIdPedido());
            }
            ruta.getVehiculo().setDisponible(false);
            enRuta.add(new UnidadEnTransito(ruta.getVehiculo(),
                    recorrido[CalculadoraTiempos.INDICE_FIN], ruta.getDestino()));
        }
        resultado.actualizarPico(enUso);
        cola.removeIf(pedido -> despachados.contains(pedido.getId()));
    }

    /**
     * Construye el escenario operativo con la cola actual y las unidades libres.
     *
     * @param cola     cola de pedidos por planificar
     * @param instante instante actual del reloj
     * @return escenario operativo del ciclo
     */
    private EscenarioOperativo construirEscenario(List<Pedido> cola, int instante) {
        List<Vehiculo> libres = new ArrayList<>();
        for (Vehiculo vehiculo : flota) {
            if (vehiculo.estaDisponible()) {
                libres.add(vehiculo);
            }
        }
        List<Entrega> entregas = Fragmentador.fragmentar(cola, TipoVehiculo.capacidadMaxima());
        return new EscenarioOperativo(almacenes, libres, entregas, instante,
                plazoMaximo, malla, tiempoServicio);
    }

    /**
     * Registra el detalle de los incumplimientos de una ruta para el informe.
     *
     * @param escenario escenario operativo
     * @param ruta      ruta con incumplimientos
     * @param salida    instante de salida de la ruta
     * @param resultado resultado agregado a actualizar
     */
    private void registrarDetalle(EscenarioOperativo escenario, Ruta ruta, int salida,
                                  ResultadoSimulacion resultado) {
        int reloj = salida;
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (Entrega entrega : ruta.getSecuencia()) {
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj);
            reloj += CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo().getTipo());
            int holgura = entrega.getHoraLimite() - reloj;
            if (holgura < 0) {
                resultado.getDetalleIncumplimientos().add(String.format(
                        "t=%d (dia %d) %s: hora limite %d, llega en %d, tarde por %d min",
                        salida, salida / 1440 + 1, ruta.getVehiculo().getTipo(),
                        entrega.getHoraLimite(), reloj, -holgura));
            }
            reloj += escenario.getTiempoServicio();
            actual = entrega.getDestino();
        }
    }
}
