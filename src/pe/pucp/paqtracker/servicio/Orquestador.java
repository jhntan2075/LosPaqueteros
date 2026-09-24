package pe.pucp.paqtracker.servicio;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.AlgoritmoMetaheuristico;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.planificador.comun.Fragmentador;
import pe.pucp.paqtracker.planificador.comun.InventarioProyectado;
import pe.pucp.paqtracker.planificador.comun.Reparador;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import pe.pucp.paqtracker.util.CalendarioTurnos;
import pe.pucp.paqtracker.util.Malla;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.function.LongFunction;

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

    private static final int MINUTOS_POR_DIA = 1440;
    private static final long NANOSEGUNDOS_POR_MILISEGUNDO = 1_000_000L;

    private final List<Almacen> almacenes;
    private final List<Vehiculo> flota;
    private final List<Pedido> pedidos;
    private final Malla malla;
    private final int saMinutos;
    private final int tiempoServicio;
    private final int plazoMaximo;
    private final int plazoDespachoDirecto;
    private final long semilla;
    private final LongFunction<AlgoritmoMetaheuristico> fabricaAlgoritmo;
    private ObservadorSimulacion observador;

    /**
     * Instala un observador que recibe el cierre de cada dia simulado. Sirve
     * para tomar los cortes por horizonte del experimento numerico sin partir
     * la simulacion en corridas independientes. Con el observador en null, que
     * es el valor por defecto, la simulacion se comporta igual que siempre.
     *
     * @param observador observador a instalar, o null para no observar
     */
    public void fijarObservador(ObservadorSimulacion observador) {
        this.observador = observador;
    }

    /**
     * Crea un orquestador que planifica con el algoritmo genetico.
     *
     * @param almacenes            almacenes del sistema
     * @param flota                flota completa
     * @param pedidos              pedidos del horizonte, con registro absoluto
     * @param malla                malla con bloqueos programados
     * @param saMinutos            paso del reloj en minutos
     * @param tiempoServicio       acondicionamiento por entrega en minutos
     * @param plazoMaximo          plazo maximo del catalogo, para ponderar urgencia
     * @param plazoDespachoDirecto plazo maximo, en minutos, para despacho directo sin pasar por el GA
     * @param semilla              semilla base para reproducibilidad
     */
    public Orquestador(List<Almacen> almacenes, List<Vehiculo> flota, List<Pedido> pedidos,
                       Malla malla, int saMinutos, int tiempoServicio, int plazoMaximo,
                       int plazoDespachoDirecto, long semilla) {
        this(almacenes, flota, pedidos, malla, saMinutos, tiempoServicio, plazoMaximo,
                plazoDespachoDirecto, semilla, PlanificadorGA::new);
    }

    /**
     * Crea un orquestador que planifica con el algoritmo indicado.
     *
     * @param almacenes            almacenes del sistema
     * @param flota                flota completa
     * @param pedidos              pedidos del horizonte, con registro absoluto
     * @param malla                malla con bloqueos programados
     * @param saMinutos            paso del reloj en minutos
     * @param tiempoServicio       acondicionamiento por entrega en minutos
     * @param plazoMaximo          plazo maximo del catalogo, para ponderar urgencia
     * @param plazoDespachoDirecto plazo maximo, en minutos, para despacho directo sin pasar por el planificador
     * @param semilla              semilla base para reproducibilidad
     * @param fabricaAlgoritmo     crea el algoritmo de cada ciclo a partir de su semilla
     */
    public Orquestador(List<Almacen> almacenes, List<Vehiculo> flota, List<Pedido> pedidos,
                       Malla malla, int saMinutos, int tiempoServicio, int plazoMaximo,
                       int plazoDespachoDirecto, long semilla,
                       LongFunction<AlgoritmoMetaheuristico> fabricaAlgoritmo) {
        this.fabricaAlgoritmo = fabricaAlgoritmo;
        this.almacenes = almacenes;
        this.flota = flota;
        this.pedidos = new ArrayList<>(pedidos);
        this.pedidos.sort(Comparator.comparingInt(Pedido::getInstanteRegistro));
        this.malla = malla;
        this.saMinutos = saMinutos;
        this.tiempoServicio = tiempoServicio;
        this.plazoMaximo = plazoMaximo;
        this.plazoDespachoDirecto = plazoDespachoDirecto;
        this.semilla = semilla;
    }

    /**
     * Corre la simulacion completa, desde el instante cero hasta el horizonte.
     *
     * @param horizonteMinutos instante final de la simulacion en minutos
     * @return resultado agregado de la simulacion
     */
    public ResultadoSimulacion simular(int horizonteMinutos) {
        return simular(horizonteMinutos, false);
    }

    /**
     * Corre la simulacion desde el instante cero hasta el horizonte, con la
     * opcion de cortar apenas se declara el colapso logistico (CU-17). Al
     * cortar por colapso no se contabilizan los pedidos pendientes, porque la
     * ejecucion termina antes de su plazo y no llegaron a incumplir.
     *
     * @param horizonteMinutos  instante final de la simulacion en minutos
     * @param detenerEnColapso  verdadero para terminar en el primer incumplimiento
     * @return resultado agregado de la simulacion
     */
    public ResultadoSimulacion simular(int horizonteMinutos, boolean detenerEnColapso) {
        ResultadoSimulacion resultado = new ResultadoSimulacion();
        Queue<Pedido> porLlegar = new LinkedList<>(pedidos);
        List<Pedido> cola = new ArrayList<>();
        List<UnidadEnTransito> enRuta = new ArrayList<>();
        int ultimoDiaRecargado = 0;
        int ultimoDiaObservado = 0;
        for (int instante = 0; instante <= horizonteMinutos; instante += saMinutos) {
            ultimoDiaObservado = observarCierreDeDia(instante, ultimoDiaObservado, cola, resultado);
            ultimoDiaRecargado = recargarAlmacenes(instante, ultimoDiaRecargado);
            liberarUnidades(enRuta, instante);
            actualizarEstadosPorTurno(instante);
            incorporarPedidos(porLlegar, cola, instante);
            int unidadesUrgentes = despacharUrgentes(cola, enRuta, instante, resultado);
            if (detenerEnColapso && resultado.getInstanteColapso() >= 0) {
                return resultado;
            }
            if (cola.isEmpty()) {
                resultado.actualizarPico(unidadesUrgentes);
                continue;
            }
            cola.sort(Comparator.comparingInt(Pedido::getHoraLimite));
            long inicioComputo = System.nanoTime();
            SolucionRuteo plan = replanificar(cola, instante);
            resultado.registrarTiempoComputo((System.nanoTime() - inicioComputo) / NANOSEGUNDOS_POR_MILISEGUNDO);
            resultado.incrementarReplanificaciones();
            resultado.sumarFitness(plan.getFitness());
            despachar(plan, cola, enRuta, instante, resultado, unidadesUrgentes);
            if (detenerEnColapso && resultado.getInstanteColapso() >= 0) {
                return resultado;
            }
        }
        registrarPedidosPendientes(porLlegar, cola, horizonteMinutos, resultado);
        return resultado;
    }

    /**
     * Notifica al observador el cierre de cada dia simulado que haya quedado
     * atras desde la ultima notificacion. Al llegar el reloj al primer instante
     * de un dia nuevo, el dia anterior ya esta completo: el estado acumulado
     * que se entrega corresponde a su corte.
     *
     * @param instante          instante actual del reloj
     * @param ultimoDiaObservado ultimo dia ya notificado, cero si ninguno
     * @param cola              cola de pedidos por planificar
     * @param resultado         resultado acumulado hasta el momento
     * @return ultimo dia notificado tras esta llamada
     */
    private int observarCierreDeDia(int instante, int ultimoDiaObservado, List<Pedido> cola,
                                     ResultadoSimulacion resultado) {
        if (observador == null) {
            return ultimoDiaObservado;
        }
        int diaCumplido = instante / MINUTOS_POR_DIA;
        while (ultimoDiaObservado < diaCumplido) {
            ultimoDiaObservado++;
            observador.alCerrarDia(ultimoDiaObservado, resultado, cola.size());
        }
        return ultimoDiaObservado;
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
     * Recarga los almacenes intermedios al cruzar la medianoche (23:59:59 del
     * dia anterior). La recarga es instantanea y deja el stock en su capacidad
     * maxima; el central no la necesita.
     *
     * @param instante           instante actual del reloj
     * @param ultimoDiaRecargado ultimo dia en que se recargo
     * @return dia vigente tras la recarga
     */
    private int recargarAlmacenes(int instante, int ultimoDiaRecargado) {
        int dia = instante / MINUTOS_POR_DIA;
        if (dia > ultimoDiaRecargado) {
            for (Almacen almacen : almacenes) {
                almacen.recargar();
            }
        }
        return dia;
    }

    /**
     * Descuenta del almacen de salida la carga de una ruta despachada y
     * registra su costo segun el tipo de unidad.
     *
     * @param ruta      ruta despachada
     * @param distancia kilometros recorridos por la ruta
     * @param resultado resultado agregado a actualizar
     */
    private void registrarSalida(Ruta ruta, int distancia, ResultadoSimulacion resultado) {
        ruta.getOrigen().descontar(ruta.getCarga());
        resultado.sumarCosto(distancia * ruta.getVehiculo().getTipo().getCostoPorKm());
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
                unidad.getVehiculo().setEstado(EstadoVehiculo.DISPONIBLE_EN_ALMACEN);
                unidad.getVehiculo().setPosicion(unidad.getDestino());
                iterador.remove();
            }
        }
    }

    /**
     * Pone en refrigerio a las unidades ociosas cuya ventana de refrigerio
     * esta vigente, y las devuelve a disponible cuando termina (LE-024). Solo
     * toca unidades que ya estaban disponibles o en refrigerio: nunca una que
     * este en ruta, averiada o fuera de turno.
     *
     * @param instante instante actual del reloj
     */
    private void actualizarEstadosPorTurno(int instante) {
        for (Vehiculo vehiculo : flota) {
            if (vehiculo.getEstado() == EstadoVehiculo.DISPONIBLE_EN_ALMACEN
                    || vehiculo.getEstado() == EstadoVehiculo.EN_REFRIGERIO) {
                vehiculo.setEstado(CalendarioTurnos.enRefrigerio(vehiculo.getId(), instante)
                        ? EstadoVehiculo.EN_REFRIGERIO : EstadoVehiculo.DISPONIBLE_EN_ALMACEN);
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
     * Despacha de inmediato, fuera de la competencia de fitness del GA, los
     * pedidos urgentes (plazo corto) que llegaron a la cola en este ciclo. Para
     * una ventana de entrega tan ajustada, esperar a que el planificador
     * decida si conviene despacharlos consume una porcion demasiado grande de
     * su plazo; en cambio se les asigna la primera unidad libre con capacidad
     * suficiente, tal como haria el planificador si los priorizara siempre.
     *
     * @param cola      cola de pedidos por planificar (se depura lo despachado)
     * @param enRuta    unidades en transito (se agregan las despachadas)
     * @param instante  instante actual del reloj
     * @param resultado resultado agregado a actualizar
     * @return cantidad de unidades despachadas de forma directa en este ciclo
     */
    private int despacharUrgentes(List<Pedido> cola, List<UnidadEnTransito> enRuta,
                                  int instante, ResultadoSimulacion resultado) {
        List<Pedido> urgentes = new ArrayList<>();
        for (Pedido pedido : cola) {
            if (pedido.getPlazo() <= plazoDespachoDirecto) {
                urgentes.add(pedido);
            }
        }
        urgentes.sort(Comparator.comparingInt(Pedido::getHoraLimite));
        int despachados = 0;
        for (Pedido pedido : urgentes) {
            int unidades = despacharPedidoDirecto(pedido, instante, enRuta, resultado);
            if (unidades > 0) {
                cola.remove(pedido);
                despachados += unidades;
            }
        }
        return despachados;
    }

    /**
     * Intenta despachar un pedido urgente. Si una sola unidad llega dentro del
     * plazo, se despacha en ella. Si ninguna llega a tiempo (o ninguna libre
     * tiene capacidad suficiente), se intenta repartir el pedido entre varias
     * unidades libres que lleguen todas dentro del plazo: un pedido de 9
     * paquetes solo cabe en un AUTO, la unidad lenta, pero dos motocicletas lo
     * entregan en menos de la mitad del tiempo. Si tampoco es posible, se
     * despacha en la unidad que llega antes, aunque sea tarde.
     *
     * Los pedidos que exceden la capacidad maxima de la flota no se manejan
     * aqui: quedan para la coordinacion multi-unidad del planificador.
     *
     * @param pedido    pedido urgente a despachar
     * @param instante  instante actual del reloj
     * @param enRuta    unidades en transito (se agregan las despachadas)
     * @param resultado resultado agregado a actualizar
     * @return cantidad de unidades despachadas; cero si el pedido no se despacho
     */
    private int despacharPedidoDirecto(Pedido pedido, int instante,
                                       List<UnidadEnTransito> enRuta, ResultadoSimulacion resultado) {
        if (pedido.getCantidad() > TipoVehiculo.capacidadMaxima()) {
            return 0;
        }
        EscenarioOperativo escenario = escenarioDirecto(instante);
        Vehiculo vehiculo = buscarVehiculoDirecto(pedido, instante, escenario);
        boolean aTiempo = vehiculo != null
                && estimarLlegada(vehiculo, pedido, instante, escenario) <= pedido.getHoraLimite();
        if (!aTiempo) {
            List<Vehiculo> reparto = buscarRepartoATiempo(pedido, instante, escenario);
            if (!reparto.isEmpty()) {
                despacharReparto(pedido, reparto, instante, escenario, enRuta, resultado);
                return reparto.size();
            }
        }
        if (vehiculo == null) {
            return 0;
        }
        despacharFragmento(pedido, vehiculo, pedido.getCantidad(), instante, escenario, enRuta, resultado);
        resultado.sumarEntregas(1);
        return 1;
    }

    /**
     * Busca un conjunto de unidades libres que, sumando capacidad, cubran el
     * pedido y lleguen todas dentro del plazo. Entre las que llegan a tiempo
     * toma primero las de mayor capacidad, para usar el menor numero de
     * unidades, y respeta el stock de cada almacen de salida.
     *
     * @param pedido    pedido urgente a repartir
     * @param instante  instante actual del reloj
     * @param escenario escenario con la malla vigente
     * @return unidades del reparto, o lista vacia si no se puede cubrir a tiempo
     */
    private List<Vehiculo> buscarRepartoATiempo(Pedido pedido, int instante, EscenarioOperativo escenario) {
        List<Vehiculo> candidatas = new ArrayList<>();
        for (Vehiculo vehiculo : flota) {
            if (vehiculo.estaDisponible()
                    && estimarLlegada(vehiculo, pedido, instante, escenario) <= pedido.getHoraLimite()) {
                candidatas.add(vehiculo);
            }
        }
        candidatas.sort(Comparator.comparingInt(Vehiculo::getCapacidad).reversed()
                .thenComparingInt(vehiculo -> estimarLlegada(vehiculo, pedido, instante, escenario)));
        Map<Integer, Integer> stockUsado = new HashMap<>();
        List<Vehiculo> reparto = new ArrayList<>();
        int restante = pedido.getCantidad();
        for (Vehiculo vehiculo : candidatas) {
            if (restante <= 0) {
                break;
            }
            Almacen origen = vehiculo.getPosicion();
            int carga = Math.min(restante, vehiculo.getCapacidad());
            int usado = stockUsado.getOrDefault(origen.getId(), 0);
            if (!origen.esIlimitado() && origen.getStockDisponible() - usado < carga) {
                continue;
            }
            stockUsado.put(origen.getId(), usado + carga);
            reparto.add(vehiculo);
            restante -= carga;
        }
        return restante <= 0 ? reparto : List.of();
    }

    /**
     * Despacha un pedido repartido: cada unidad lleva la mayor porcion que le
     * cabe. El pedido cuenta como una sola entrega en el resultado.
     *
     * @param pedido    pedido urgente repartido
     * @param reparto   unidades que lo transportan
     * @param instante  instante actual del reloj
     * @param escenario escenario con la malla vigente
     * @param enRuta    unidades en transito (se agregan las despachadas)
     * @param resultado resultado agregado a actualizar
     */
    private void despacharReparto(Pedido pedido, List<Vehiculo> reparto, int instante,
                                  EscenarioOperativo escenario, List<UnidadEnTransito> enRuta,
                                  ResultadoSimulacion resultado) {
        int restante = pedido.getCantidad();
        for (Vehiculo vehiculo : reparto) {
            int carga = Math.min(restante, vehiculo.getCapacidad());
            despacharFragmento(pedido, vehiculo, carga, instante, escenario, enRuta, resultado);
            restante -= carga;
        }
        resultado.sumarEntregas(1);
        resultado.registrarReparto();
    }

    /**
     * Despacha en una unidad una porcion de un pedido urgente.
     *
     * @param pedido    pedido de origen
     * @param vehiculo  unidad que transporta la porcion
     * @param cantidad  paquetes de la porcion
     * @param instante  instante actual del reloj
     * @param escenario escenario con la malla vigente
     * @param enRuta    unidades en transito (se agrega la despachada)
     * @param resultado resultado agregado a actualizar
     */
    private void despacharFragmento(Pedido pedido, Vehiculo vehiculo, int cantidad, int instante,
                                    EscenarioOperativo escenario, List<UnidadEnTransito> enRuta,
                                    ResultadoSimulacion resultado) {
        Entrega entrega = new Entrega(0, pedido.getId(), pedido.getDestino(), cantidad,
                pedido.getInstanteRegistro(), pedido.getPlazo());
        Ruta ruta = new Ruta(vehiculo, vehiculo.getPosicion());
        ruta.getSecuencia().add(entrega);
        ruta.setDestino(almacenDestinoDirecto(entrega.getDestino(), escenario));
        despacharRutaDirecta(ruta, instante, escenario, enRuta, resultado);
    }

    /**
     * Busca la unidad libre que mejor atiende un pedido urgente: entre las que
     * alcanzan a llegar dentro del plazo, la de menor capacidad suficiente
     * (para no gastar una unidad grande en una carga pequena); si ninguna
     * llega a tiempo, la que llega antes.
     *
     * La velocidad del tipo de unidad y la distancia desde su almacen pesan
     * mas que la capacidad: una bicicleta ociosa no sirve para un destino
     * lejano con plazo corto, aunque la carga le quepa de sobra.
     *
     * @param pedido    pedido a despachar
     * @param instante  instante actual del reloj
     * @param escenario escenario con la malla vigente, para estimar tiempos
     * @return unidad elegida, o null si ninguna califica
     */
    private Vehiculo buscarVehiculoDirecto(Pedido pedido, int instante, EscenarioOperativo escenario) {
        Vehiculo elegido = null;
        int llegadaElegida = Integer.MAX_VALUE;
        for (Vehiculo vehiculo : flota) {
            if (!puedeAtender(vehiculo, pedido)) {
                continue;
            }
            int llegada = estimarLlegada(vehiculo, pedido, instante, escenario);
            if (superaAlCandidato(vehiculo, llegada, elegido, llegadaElegida, pedido.getHoraLimite())) {
                elegido = vehiculo;
                llegadaElegida = llegada;
            }
        }
        return elegido;
    }

    /**
     * Indica si una unidad esta libre y puede transportar el pedido desde su
     * almacen actual.
     *
     * @param vehiculo unidad a evaluar
     * @param pedido   pedido a despachar
     * @return verdadero si la unidad puede atender el pedido
     */
    private boolean puedeAtender(Vehiculo vehiculo, Pedido pedido) {
        return vehiculo.estaDisponible()
                && vehiculo.getCapacidad() >= pedido.getCantidad()
                && (vehiculo.getPosicion().esIlimitado()
                        || vehiculo.getPosicion().tieneStock(pedido.getCantidad()));
    }

    /**
     * Estima el instante de llegada de una unidad al destino del pedido,
     * saliendo de su almacen actual en el instante indicado. Incluye la pausa
     * de refrigerio si cae durante el viaje, igual que el recorrido real; sin
     * ella el despacho directo elegia unidades que parecian llegar a tiempo y
     * llegaban tarde por la hora de refrigerio.
     *
     * @param vehiculo  unidad a evaluar
     * @param pedido    pedido a despachar
     * @param instante  instante de salida
     * @param escenario escenario con la malla vigente
     * @return instante absoluto estimado de llegada
     */
    private int estimarLlegada(Vehiculo vehiculo, Pedido pedido, int instante,
                               EscenarioOperativo escenario) {
        int tramo = CalculadoraTiempos.distancia(escenario,
                vehiculo.getPosicion().getUbicacion(), pedido.getDestino(), instante);
        return CalendarioTurnos.avanzarConPausa(vehiculo.getId(), instante,
                CalculadoraTiempos.minutosDeViaje(tramo, vehiculo.getTipo()));
    }

    /**
     * Compara un candidato contra el mejor encontrado hasta ahora: primero
     * prima llegar dentro del plazo, luego no desperdiciar capacidad y, si
     * ninguno llega a tiempo, llegar lo antes posible.
     *
     * @param vehiculo       candidato a evaluar
     * @param llegada        llegada estimada del candidato
     * @param elegido        mejor candidato hasta ahora, o null
     * @param llegadaElegida llegada estimada del mejor candidato
     * @param horaLimite     hora limite del pedido
     * @return verdadero si el candidato es mejor que el actual
     */
    private boolean superaAlCandidato(Vehiculo vehiculo, int llegada, Vehiculo elegido,
                                      int llegadaElegida, int horaLimite) {
        if (elegido == null) {
            return true;
        }
        boolean aTiempo = llegada <= horaLimite;
        if (aTiempo != (llegadaElegida <= horaLimite)) {
            return aTiempo;
        }
        if (aTiempo) {
            return vehiculo.getCapacidad() < elegido.getCapacidad();
        }
        return llegada < llegadaElegida;
    }

    /**
     * Construye el escenario minimo que necesita un despacho directo: sin
     * entregas ni flota, solo los almacenes y la malla con bloqueos vigentes
     * para calcular distancias y tiempos.
     *
     * @param instante instante actual del reloj
     * @return escenario operativo para calculos de despacho directo
     */
    private EscenarioOperativo escenarioDirecto(int instante) {
        return new EscenarioOperativo(almacenes, List.of(), List.of(),
                instante, plazoMaximo, malla, tiempoServicio);
    }

    /**
     * Elige el almacen de retorno para un despacho directo: el mas cercano con
     * stock proyectado positivo, calculado sobre una solucion vacia (stock
     * inicial sin descuentos de este ciclo).
     *
     * @param destino   nodo de entrega de la ruta
     * @param escenario escenario con los almacenes y la malla vigente
     * @return almacen de retorno valido
     */
    private Almacen almacenDestinoDirecto(Nodo destino, EscenarioOperativo escenario) {
        Map<Integer, Integer> stock = InventarioProyectado.calcular(new SolucionRuteo(), escenario);
        return new Reparador(escenario).almacenValido(destino, stock);
    }

    /**
     * Despacha una ruta de un solo pedido urgente, registrando distancia,
     * incumplimientos y uso de flota como lo haria el despacho regular. Las
     * entregas las cuenta quien la invoca, para que un pedido repartido en
     * varias unidades cuente una sola vez.
     *
     * @param ruta      ruta a despachar
     * @param instante  instante actual del reloj
     * @param escenario escenario con la malla vigente
     * @param enRuta    unidades en transito (se agrega la despachada)
     * @param resultado resultado agregado a actualizar
     */
    private void despacharRutaDirecta(Ruta ruta, int instante, EscenarioOperativo escenario,
                                      List<UnidadEnTransito> enRuta, ResultadoSimulacion resultado) {
        int[] recorrido = CalculadoraTiempos.recorrer(escenario, ruta, instante);
        resultado.registrarUso(ruta.getVehiculo().getTipo().name());
        resultado.sumarDistancia(recorrido[CalculadoraTiempos.INDICE_DISTANCIA]);
        registrarSalida(ruta, recorrido[CalculadoraTiempos.INDICE_DISTANCIA], resultado);
        resultado.sumarIncumplimientos(recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS]);
        if (recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS] > 0) {
            resultado.registrarColapso(instante);
            registrarDetalle(escenario, ruta, instante, resultado);
        }
        ruta.getVehiculo().setEstado(EstadoVehiculo.EN_RUTA);
        enRuta.add(new UnidadEnTransito(ruta.getVehiculo(),
                recorrido[CalculadoraTiempos.INDICE_FIN], ruta.getDestino()));
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
        AlgoritmoMetaheuristico planificador = fabricaAlgoritmo.apply(semilla + instante);
        return planificador.planificar(escenario);
    }

    /**
     * Despacha las rutas del plan: cada unidad sale de inmediato y queda en
     * transito hasta que termina su ruta.
     *
     * @param plan             plan a despachar
     * @param cola             cola de pedidos (se depura la parte despachada)
     * @param enRuta           unidades en transito (se agregan las despachadas)
     * @param instante         instante actual del reloj
     * @param resultado        resultado agregado a actualizar
     * @param unidadesUrgentes unidades ya despachadas este ciclo por despacho directo
     */
    private void despachar(SolucionRuteo plan, List<Pedido> cola, List<UnidadEnTransito> enRuta,
                           int instante, ResultadoSimulacion resultado, int unidadesUrgentes) {
        Set<Integer> despachados = new HashSet<>();
        int enUso = unidadesUrgentes;
        EscenarioOperativo escenario = construirEscenario(cola, instante);
        for (Ruta ruta : plan.getRutas()) {
            if (ruta.getSecuencia().isEmpty()) {
                continue;
            }
            enUso++;
            resultado.registrarUso(ruta.getVehiculo().getTipo().name());
            int[] recorrido = CalculadoraTiempos.recorrer(escenario, ruta, instante);
            resultado.sumarDistancia(recorrido[CalculadoraTiempos.INDICE_DISTANCIA]);
            registrarSalida(ruta, recorrido[CalculadoraTiempos.INDICE_DISTANCIA], resultado);
            resultado.sumarIncumplimientos(recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS]);
            if (recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS] > 0) {
                resultado.registrarColapso(instante);
                registrarDetalle(escenario, ruta, instante, resultado);
            }
            resultado.sumarEntregas(ruta.getSecuencia().size());
            for (Entrega entrega : ruta.getSecuencia()) {
                despachados.add(entrega.getIdPedido());
            }
            ruta.getVehiculo().setEstado(EstadoVehiculo.EN_RUTA);
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
        int idVehiculo = ruta.getVehiculo().getId();
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (Entrega entrega : ruta.getSecuencia()) {
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj);
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            int holgura = entrega.getHoraLimite() - reloj;
            if (holgura < 0) {
                resultado.getDetalleIncumplimientos().add(String.format(
                        "t=%d (dia %d) %s: hora limite %d, llega en %d, tarde por %d min",
                        salida, salida / 1440 + 1, ruta.getVehiculo().getTipo(),
                        entrega.getHoraLimite(), reloj, -holgura));
            }
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
    }
}
