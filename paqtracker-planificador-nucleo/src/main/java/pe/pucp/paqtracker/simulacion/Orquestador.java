package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Averia;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.TipoAveria;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Tramo;
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
import java.util.IdentityHashMap;
import java.util.Iterator;
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
 * El metodo replanificar es el punto de disparo: lo invoca cada paso del reloj
 * y tambien el paso que quien conduce la simulacion ejecuta fuera del salto Sa
 * ante un evento (pedido o averia registrados en vivo).
 *
 * Una averia inmoviliza solo a su unidad, que el planificador deja de ver hasta
 * reincorporarse; el resto de la flota sigue (LE-incidencias, CU-13).
 *
 * Guarda la configuracion y las operaciones de cada paso; el estado que cambia
 * entre pasos vive en {@link SimulacionEnCurso}. {@link #simular} corre la
 * simulacion completa de una vez (experimentacion) y {@link #iniciar} entrega
 * la simulacion para que un reloj externo la avance paso a paso (API).
 */
public final class Orquestador {

    private static final int MINUTOS_POR_DIA = 1440;
    private static final int PRIMER_ID_LIBERADA = -1;

    private final List<Almacen> almacenes;
    private final List<Vehiculo> flota;
    private final List<Pedido> pedidos;
    private final List<Averia> averias;
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
     * Entregas liberadas por una averia, pendientes de replanificar. Se
     * limpia al inicio de cada {@link #iniciar}; es estado de la corrida, no
     * configuracion, pero vive como campo porque {@link #construirEscenario}
     * y {@link #replanificar} la necesitan sin cambiar su firma publica.
     */
    private final List<Entrega> liberadas = new ArrayList<>();

    /**
     * Siguiente identificador para una entrega liberada. Son negativos para no chocar con los que el
     * {@link Fragmentador} asigna desde cero en cada ciclo: el cruce del GA identifica las entregas por
     * su identificador. Se reinicia con {@link #liberadas}.
     */
    private int siguienteIdLiberada = PRIMER_ID_LIBERADA;

    /**
     * Crea un orquestador que planifica con el algoritmo genetico.
     *
     * @param almacenes            almacenes del sistema
     * @param flota                flota completa
     * @param pedidos              pedidos del horizonte, con registro absoluto
     * @param averias              averias programadas del horizonte
     * @param malla                malla con bloqueos programados
     * @param saMinutos            paso del reloj en minutos
     * @param tiempoServicio       acondicionamiento por entrega en minutos
     * @param plazoMaximo          plazo maximo del catalogo, para ponderar urgencia
     * @param plazoDespachoDirecto plazo maximo, en minutos, para despacho directo sin pasar por el GA
     * @param semilla              semilla base para reproducibilidad
     */
    public Orquestador(List<Almacen> almacenes, List<Vehiculo> flota, List<Pedido> pedidos,
                       List<Averia> averias, Malla malla, int saMinutos, int tiempoServicio, int plazoMaximo,
                       int plazoDespachoDirecto, long semilla) {
        this(almacenes, flota, pedidos, averias, malla, saMinutos, tiempoServicio, plazoMaximo,
                plazoDespachoDirecto, semilla, PlanificadorGA::new);
    }

    /**
     * Crea un orquestador que planifica con el algoritmo indicado.
     *
     * @param almacenes            almacenes del sistema
     * @param flota                flota completa
     * @param pedidos              pedidos del horizonte, con registro absoluto
     * @param averias              averias programadas del horizonte
     * @param malla                malla con bloqueos programados
     * @param saMinutos            paso del reloj en minutos
     * @param tiempoServicio       acondicionamiento por entrega en minutos
     * @param plazoMaximo          plazo maximo del catalogo, para ponderar urgencia
     * @param plazoDespachoDirecto plazo maximo, en minutos, para despacho directo sin pasar por el planificador
     * @param semilla              semilla base para reproducibilidad
     * @param fabricaAlgoritmo     crea el algoritmo de cada ciclo a partir de su semilla
     * @throws IllegalArgumentException si una averia programada es sobre una unidad que no existe
     */
    public Orquestador(List<Almacen> almacenes, List<Vehiculo> flota, List<Pedido> pedidos,
                       List<Averia> averias, Malla malla, int saMinutos, int tiempoServicio, int plazoMaximo,
                       int plazoDespachoDirecto, long semilla,
                       LongFunction<AlgoritmoMetaheuristico> fabricaAlgoritmo) {
        this.fabricaAlgoritmo = fabricaAlgoritmo;
        this.almacenes = almacenes;
        this.flota = flota;
        this.pedidos = new ArrayList<>(pedidos);
        this.pedidos.sort(Comparator.comparingInt(Pedido::getInstanteRegistro));
        this.averias = new ArrayList<>(averias);
        this.averias.sort(Comparator.comparingInt(Averia::getInstante));
        for (Averia averia : this.averias) {
            if (buscarVehiculo(averia.getIdVehiculo()) == null) {
                throw new IllegalArgumentException("Averia sobre una unidad que no existe: " + averia);
            }
        }
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
        SimulacionEnCurso simulacion = iniciar(detenerEnColapso);
        for (int instante = 0; instante <= horizonteMinutos; instante += saMinutos) {
            simulacion.avanzar(instante);
            if (simulacion.estaDetenida()) {
                return simulacion.getResultado();
            }
        }
        simulacion.cerrar(horizonteMinutos);
        return simulacion.getResultado();
    }

    /**
     * Prepara una simulacion que avanza paso a paso, para que la conduzca un
     * reloj externo (la API). Los pasos deben respetar el salto Sa del
     * orquestador para reproducir el comportamiento de {@link #simular}.
     *
     * @param detenerEnColapso verdadero para detenerse en el primer incumplimiento (CU-17)
     * @return simulacion lista para su primer paso
     */
    public SimulacionEnCurso iniciar(boolean detenerEnColapso) {
        liberadas.clear();
        siguienteIdLiberada = PRIMER_ID_LIBERADA;
        return new SimulacionEnCurso(this, pedidos, averias, detenerEnColapso);
    }

    /**
     * @return verdadero si hay entregas liberadas por una averia que aun no se replanifican
     */
    boolean hayEntregasLiberadas() {
        return !liberadas.isEmpty();
    }

    /**
     * @return salto del reloj Sa, en minutos
     */
    public int getSaMinutos() {
        return saMinutos;
    }

    /**
     * @return flota completa; sus estados y posiciones cambian durante la simulacion
     */
    public List<Vehiculo> getFlota() {
        return flota;
    }

    /**
     * @return almacenes; su stock cambia durante la simulacion
     */
    public List<Almacen> getAlmacenes() {
        return almacenes;
    }

    /**
     * @return bloqueos programados de la simulacion, de solo lectura
     */
    public List<Bloqueo> getBloqueos() {
        return malla.getBloqueos();
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
    int observarCierreDeDia(int instante, int ultimoDiaObservado, List<Pedido> cola,
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

    /** Evento pendiente: traslada una unidad averiada (tipo 2 o 3) a un almacen al instante dado. */
    record EventoPosicion(Vehiculo vehiculo, int instante, Almacen destino) {
    }

    /** Evento pendiente: reincorpora una unidad averiada al instante dado. */
    record EventoDisponible(Vehiculo vehiculo, int instante) {
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
    void registrarPedidosPendientes(Queue<Pedido> porLlegar, List<Pedido> cola,
                                             int instanteFinal, ResultadoSimulacion resultado) {
        List<Pedido> pendientes = new ArrayList<>(porLlegar);
        pendientes.addAll(cola);
        for (Pedido pedido : pendientes) {
            if (pedido.getHoraLimite() <= instanteFinal) {
                resultado.sumarIncumplimientos(1);
                resultado.registrarColapso(ColapsoLogistico.porPlazoVencidoSinDespacho(pedido));
                resultado.getDetalleIncumplimientos().add(String.format(
                        "pedido %d: hora limite %d, no fue entregado",
                        pedido.getId(), pedido.getHoraLimite()));
            }
        }
        for (Entrega entrega : liberadas) {
            if (entrega.getHoraLimite() <= instanteFinal) {
                resultado.sumarIncumplimientos(1);
                resultado.registrarColapso(ColapsoLogistico.porPlazoVencidoSinDespacho(entrega.getIdPedido(),
                        entrega.getHoraLimite()));
                resultado.getDetalleIncumplimientos().add(String.format(
                        "pedido %d: hora limite %d, liberado por averia y no fue entregado",
                        entrega.getIdPedido(), entrega.getHoraLimite()));
            }
        }
    }

    /**
     * Declara el colapso si algun pedido de la cola llego a su hora limite sin
     * despacharse. Sin esta revision, un pedido varado en la cola solo se
     * detectaba al cerrar el horizonte y la simulacion seguia despues del
     * colapso real. No suma incumplimientos: el pedido aun puede salir tarde en
     * un despacho, o contarse al cerrar, y se contaria dos veces.
     *
     * @param cola      cola de pedidos por planificar
     * @param instante  instante actual del reloj
     * @param resultado resultado agregado a actualizar
     */
    void detectarVencidosEnCola(List<Pedido> cola, int instante, ResultadoSimulacion resultado) {
        cola.stream()
                .filter(pedido -> pedido.getHoraLimite() <= instante)
                .min(Comparator.comparingInt(Pedido::getHoraLimite))
                .ifPresent(pedido -> resultado.registrarColapso(ColapsoLogistico.porPlazoVencidoSinDespacho(pedido)));
        liberadas.stream()
                .filter(entrega -> entrega.getHoraLimite() <= instante)
                .min(Comparator.comparingInt(Entrega::getHoraLimite))
                .ifPresent(entrega -> resultado.registrarColapso(ColapsoLogistico.porPlazoVencidoSinDespacho(
                        entrega.getIdPedido(), entrega.getHoraLimite())));
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
    int recargarAlmacenes(int instante, int ultimoDiaRecargado) {
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
     * Valida una averia antes de programarla: la unidad debe existir y no estar averiada ni tener otra
     * averia pendiente. Falla rapido para que quien la registra reciba un error claro en lugar de que
     * se descarte al procesarla.
     *
     * @param averia     averia a validar
     * @param pendientes averias programadas que aun no se aplican
     * @throws IllegalArgumentException si la averia es nula o la unidad no existe
     * @throws IllegalStateException    si la unidad ya esta averiada o tiene otra averia pendiente
     */
    void validarAveria(Averia averia, Iterable<Averia> pendientes) {
        if (averia == null) {
            throw new IllegalArgumentException("La averia a agregar es nula");
        }
        Vehiculo vehiculo = buscarVehiculo(averia.getIdVehiculo());
        if (vehiculo == null) {
            throw new IllegalArgumentException("No existe la unidad " + averia.getIdVehiculo());
        }
        if (vehiculo.getEstado() == EstadoVehiculo.AVERIADA) {
            throw new IllegalStateException("La unidad " + vehiculo + " ya esta averiada");
        }
        for (Averia pendiente : pendientes) {
            if (pendiente.getIdVehiculo() == averia.getIdVehiculo()) {
                throw new IllegalStateException("La unidad " + vehiculo + " ya tiene una averia pendiente");
            }
        }
    }

    /**
     * Aplica las averias cuyo instante ya llego. Una averia programada sobre una unidad que ya esta
     * averiada se ignora: solo puede venir de la lista inicial (experimentacion), porque las que se
     * agregan en vivo se validan con {@link #validarAveria}.
     *
     * @param averiasPorOcurrir cola de averias pendientes, ordenada por instante
     * @param instante          instante actual del reloj
     * @param enRuta            unidades en transito (se retira o se reemplaza la averiada)
     * @param traslados         eventos de traslado pendientes (se agregan)
     * @param disponibles       eventos de reincorporacion pendientes (se agregan)
     * @param resultado         resultado agregado a actualizar
     * @return averias aplicadas en este paso, en orden de instante
     */
    List<AveriaAplicada> procesarAverias(Queue<Averia> averiasPorOcurrir, int instante,
                                         List<UnidadEnTransito> enRuta, List<EventoPosicion> traslados,
                                         List<EventoDisponible> disponibles, ResultadoSimulacion resultado) {
        List<AveriaAplicada> aplicadas = new ArrayList<>();
        while (!averiasPorOcurrir.isEmpty() && averiasPorOcurrir.peek().getInstante() <= instante) {
            Averia averia = averiasPorOcurrir.poll();
            Vehiculo vehiculo = buscarVehiculo(averia.getIdVehiculo());
            if (vehiculo != null && vehiculo.getEstado() != EstadoVehiculo.AVERIADA) {
                aplicadas.add(aplicarAveria(averia, vehiculo, enRuta, instante, resultado));
                programarRecuperacion(averia, vehiculo, traslados, disponibles);
            }
        }
        return aplicadas;
    }

    /**
     * Inmoviliza la unidad en el punto exacto de la averia. Si estaba en ruta, tipo 1 decide entre seguir
     * con su carga y trasbordar lo urgente ({@link GestorTrasbordo}); tipo 2 y 3 liberan lo que aun no
     * entregaba para que el planificador lo reasigne. Si ya habia terminado su ruta, queda en su almacen de
     * destino.
     */
    private AveriaAplicada aplicarAveria(Averia averia, Vehiculo vehiculo, List<UnidadEnTransito> enRuta,
                                         int instante, ResultadoSimulacion resultado) {
        int instanteAveria = averia.getInstante();
        UnidadEnTransito transito = buscarEnTransito(enRuta, vehiculo);
        GestorTrasbordo.Decision decision = new GestorTrasbordo.Decision(null, List.of());
        List<Entrega> liberadasAhora = List.of();
        Nodo ubicacion = vehiculo.getUbicacionActual();
        if (transito != null && transito.getLibreEn() <= instanteAveria) {
            enRuta.remove(transito);
            vehiculo.setPosicion(transito.getDestino());
            ubicacion = transito.getDestino().getUbicacion();
        } else if (transito != null && averia.getTipo() == TipoAveria.TIPO_1) {
            decision = decidirTipo1(transito, instanteAveria, Math.max(instanteAveria, instante), enRuta, resultado);
            ubicacion = transito.ubicacionEn(instanteAveria);
        } else if (transito != null) {
            UnidadEnTransito.Corte corte = transito.cortarEn(instanteAveria);
            liberadasAhora = liberarCarga(transito, corte, resultado);
            enRuta.remove(transito);
            ubicacion = corte.ubicacion();
        }
        vehiculo.fijarUbicacionAveria(ubicacion);
        vehiculo.setEstado(EstadoVehiculo.AVERIADA);
        resultado.registrarAveria();
        int trasladoEn = averia.tieneTraslado() ? averia.getInstanteTraslado() : AveriaAplicada.SIN_TRASLADO;
        return new AveriaAplicada(averia, vehiculo, ubicacion, liberadasAhora, transito, decision.averiada(),
                decision.trasbordos(), averia.getInstanteReincorporacion(), trasladoEn);
    }

    /**
     * Tipo 1 en ruta: decide que sigue a bordo y que se trasborda, reemplaza el recorrido de la averiada,
     * pone en transito a las receptoras y corrige las metricas con las nuevas llegadas.
     */
    private GestorTrasbordo.Decision decidirTipo1(UnidadEnTransito transito, int instanteAveria, int salida,
                                                  List<UnidadEnTransito> enRuta, ResultadoSimulacion resultado) {
        EscenarioOperativo escenario = escenarioDirecto(salida);
        GestorTrasbordo.Decision decision = new GestorTrasbordo(escenario, flota,
                destino -> almacenDestinoDirecto(destino, escenario)).decidir(transito, instanteAveria, salida);
        enRuta.set(enRuta.indexOf(transito), decision.averiada());
        sumarRecorrido(transito.getVehiculo(), kilometros(decision.averiada()) - kilometros(transito), resultado);
        for (Trasbordo trasbordo : decision.trasbordos()) {
            UnidadEnTransito receptora = trasbordo.receptora();
            receptora.getVehiculo().setEstado(EstadoVehiculo.EN_RUTA);
            enRuta.add(receptora);
            resultado.registrarUso(receptora.getVehiculo().getTipo().name());
            sumarRecorrido(receptora.getVehiculo(), kilometros(receptora), resultado);
        }
        reprogramarLlegadas(transito, decision, instanteAveria, resultado);
        return decision;
    }

    /**
     * Reemplaza en las metricas la llegada prevista al despachar de cada entrega pendiente por la nueva
     * (a bordo y desplazada, o en la receptora). Ajusta margenes e incumplimientos y, si alguna entrega
     * que llegaba a tiempo pasa a llegar tarde, declara el colapso en el instante de la averia, que es
     * cuando el incumplimiento se vuelve seguro.
     */
    private void reprogramarLlegadas(UnidadEnTransito transito, GestorTrasbordo.Decision decision,
                                     int instanteAveria, ResultadoSimulacion resultado) {
        Map<Entrega, Integer> nuevas = new IdentityHashMap<>(decision.averiada().llegadasPorEntrega());
        Map<Entrega, Vehiculo> portadoras = new IdentityHashMap<>();
        for (Trasbordo trasbordo : decision.trasbordos()) {
            Map<Entrega, Integer> llegadas = trasbordo.receptora().llegadasPorEntrega();
            nuevas.putAll(llegadas);
            llegadas.keySet().forEach(entrega -> portadoras.put(entrega, trasbordo.receptora().getVehiculo()));
        }
        UnidadEnTransito.Corte antes = transito.cortarEn(instanteAveria);
        for (int i = 0; i < antes.entregasPendientes().size(); i++) {
            Entrega entrega = antes.entregasPendientes().get(i);
            int anterior = antes.tramosPendientes().get(i).getLlegada();
            int nueva = nuevas.get(entrega);
            resultado.retirarMargenEntrega(entrega.getHoraLimite() - anterior, entrega.getCantidad());
            resultado.registrarMargenEntrega(entrega.getHoraLimite() - nueva, entrega.getCantidad());
            boolean eraTarde = anterior > entrega.getHoraLimite();
            boolean esTarde = nueva > entrega.getHoraLimite();
            if (eraTarde != esTarde) {
                resultado.sumarIncumplimientos(esTarde ? 1 : -1);
            }
            if (esTarde && !eraTarde) {
                declararTardia(entrega, nueva, instanteAveria,
                        portadoras.getOrDefault(entrega, transito.getVehiculo()), resultado);
            }
        }
    }

    private static void declararTardia(Entrega entrega, int llegada, int instanteAveria, Vehiculo vehiculo,
                                       ResultadoSimulacion resultado) {
        resultado.registrarColapso(ColapsoLogistico.porEntregaTardia(entrega.getIdPedido(), instanteAveria,
                entrega.getHoraLimite(), llegada, vehiculo));
        resultado.getDetalleIncumplimientos().add(String.format(
                "t=%d %s: averia tipo 1, hora limite %d, llega en %d, tarde por %d min", instanteAveria, vehiculo,
                entrega.getHoraLimite(), llegada, llegada - entrega.getHoraLimite()));
    }

    private static void sumarRecorrido(Vehiculo vehiculo, int kilometros, ResultadoSimulacion resultado) {
        resultado.sumarDistancia(kilometros);
        resultado.sumarCosto(kilometros * vehiculo.getTipo().getCostoPorKm());
    }

    private static int kilometros(UnidadEnTransito transito) {
        return transito.getTramos().stream().mapToInt(Tramo::getDistancia).sum();
    }

    /**
     * Tipo 2 y 3 en ruta: libera lo que la unidad aun no entregaba y deshace lo que se conto al
     * despacharlo, para que al redespacharse no se cuente dos veces. Devuelve la carga al almacen de
     * salida, descuenta los kilometros que ya no se recorreran con su costo, y retira las entregas, sus
     * margenes y sus incumplimientos previstos. Las entregas liberadas reciben un identificador propio
     * (negativo) para no chocar con las que el fragmentador numera en cada ciclo.
     */
    private List<Entrega> liberarCarga(UnidadEnTransito transito, UnidadEnTransito.Corte corte,
                                       ResultadoSimulacion resultado) {
        List<Entrega> liberadasAhora = new ArrayList<>();
        int carga = 0;
        for (int i = 0; i < corte.entregasPendientes().size(); i++) {
            Entrega entrega = corte.entregasPendientes().get(i);
            int llegadaPrevista = corte.tramosPendientes().get(i).getLlegada();
            carga += entrega.getCantidad();
            resultado.retirarMargenEntrega(entrega.getHoraLimite() - llegadaPrevista, entrega.getCantidad());
            if (llegadaPrevista > entrega.getHoraLimite()) {
                resultado.sumarIncumplimientos(-1);
            }
            liberadasAhora.add(new Entrega(siguienteIdLiberada--, entrega.getIdPedido(), entrega.getDestino(),
                    entrega.getCantidad(), entrega.getInstanteRegistro(), entrega.getPlazo()));
        }
        transito.getOrigen().reintegrar(carga);
        int noRecorridos = corte.kilometrosTotales() - corte.kilometrosRecorridos();
        resultado.sumarDistancia(-noRecorridos);
        resultado.sumarCosto(-noRecorridos * transito.getVehiculo().getTipo().getCostoPorKm());
        resultado.sumarEntregas(-liberadasAhora.size());
        liberadas.addAll(liberadasAhora);
        return liberadasAhora;
    }

    /**
     * Programa los eventos que devuelven una unidad averiada a operar: tipo 1 solo su reincorporacion;
     * tipo 2 y 3, ademas, el traslado instantaneo al almacen central tras su permanencia en el sitio.
     */
    private void programarRecuperacion(Averia averia, Vehiculo vehiculo, List<EventoPosicion> traslados,
                                       List<EventoDisponible> disponibles) {
        if (averia.tieneTraslado()) {
            traslados.add(new EventoPosicion(vehiculo, averia.getInstanteTraslado(), almacenCentral()));
        }
        disponibles.add(new EventoDisponible(vehiculo, averia.getInstanteReincorporacion()));
    }

    /**
     * Aplica los eventos de averia cuyo instante ya llego: primero los traslados al almacen central y
     * luego las reincorporaciones. Una unidad que se reincorpora con su recorrido pendiente (tipo 1 en
     * ruta) vuelve a estar en ruta; las demas quedan disponibles donde estan.
     *
     * @param traslados   eventos de traslado pendientes (se consumen)
     * @param disponibles eventos de reincorporacion pendientes (se consumen)
     * @param enRuta      unidades en transito
     * @param instante    instante actual del reloj
     * @return unidades reincorporadas en este paso
     */
    List<Vehiculo> liberarAveriados(List<EventoPosicion> traslados, List<EventoDisponible> disponibles,
                                    List<UnidadEnTransito> enRuta, int instante) {
        Iterator<EventoPosicion> iteradorTraslados = traslados.iterator();
        while (iteradorTraslados.hasNext()) {
            EventoPosicion traslado = iteradorTraslados.next();
            if (traslado.instante() <= instante) {
                traslado.vehiculo().setPosicion(traslado.destino());
                iteradorTraslados.remove();
            }
        }
        List<Vehiculo> reincorporados = new ArrayList<>();
        Iterator<EventoDisponible> iteradorDisponibles = disponibles.iterator();
        while (iteradorDisponibles.hasNext()) {
            EventoDisponible disponible = iteradorDisponibles.next();
            if (disponible.instante() <= instante) {
                Vehiculo vehiculo = disponible.vehiculo();
                vehiculo.setEstado(buscarEnTransito(enRuta, vehiculo) != null
                        ? EstadoVehiculo.EN_RUTA : EstadoVehiculo.DISPONIBLE_EN_ALMACEN);
                reincorporados.add(vehiculo);
                iteradorDisponibles.remove();
            }
        }
        return reincorporados;
    }

    /**
     * @param idVehiculo identificador de la unidad a buscar
     * @return la unidad de la flota con ese identificador, o null si no existe
     */
    private Vehiculo buscarVehiculo(int idVehiculo) {
        for (Vehiculo vehiculo : flota) {
            if (vehiculo.getId() == idVehiculo) {
                return vehiculo;
            }
        }
        return null;
    }

    /**
     * @param enRuta   unidades en transito
     * @param vehiculo unidad a buscar
     * @return el registro en transito de esa unidad, o null si no esta en ruta
     */
    private UnidadEnTransito buscarEnTransito(List<UnidadEnTransito> enRuta, Vehiculo vehiculo) {
        for (UnidadEnTransito unidad : enRuta) {
            if (unidad.getVehiculo() == vehiculo) {
                return unidad;
            }
        }
        return null;
    }

    /**
     * @return el almacen central (el unico con inventario ilimitado)
     */
    private Almacen almacenCentral() {
        for (Almacen almacen : almacenes) {
            if (almacen.esIlimitado()) {
                return almacen;
            }
        }
        throw new IllegalStateException("No hay almacen central configurado");
    }

    /**
     * Libera las unidades cuyo instante de retorno ya paso, dejandolas
     * disponibles en su almacen de destino.
     *
     * @param enRuta   unidades en transito
     * @param instante instante actual del reloj
     * @return unidades liberadas en este paso
     */
    List<Vehiculo> liberarUnidades(List<UnidadEnTransito> enRuta, int instante) {
        List<Vehiculo> liberadas = new ArrayList<>();
        Iterator<UnidadEnTransito> iterador = enRuta.iterator();
        while (iterador.hasNext()) {
            UnidadEnTransito unidad = iterador.next();
            if (unidad.getLibreEn() <= instante) {
                unidad.getVehiculo().setEstado(EstadoVehiculo.DISPONIBLE_EN_ALMACEN);
                unidad.getVehiculo().setPosicion(unidad.getDestino());
                liberadas.add(unidad.getVehiculo());
                iterador.remove();
            }
        }
        return liberadas;
    }

    /**
     * Pone en refrigerio a las unidades ociosas cuya ventana de refrigerio
     * esta vigente, y las devuelve a disponible cuando termina (LE-024). Solo
     * toca unidades que ya estaban disponibles o en refrigerio: nunca una que
     * este en ruta, averiada o fuera de turno.
     *
     * @param instante instante actual del reloj
     */
    void actualizarEstadosPorTurno(int instante) {
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
     * @return pedidos incorporados en este paso
     */
    List<Pedido> incorporarPedidos(Queue<Pedido> porLlegar, List<Pedido> cola, int instante) {
        List<Pedido> incorporados = new ArrayList<>();
        while (!porLlegar.isEmpty() && porLlegar.peek().getInstanteRegistro() <= instante) {
            Pedido pedido = porLlegar.poll();
            cola.add(pedido);
            incorporados.add(pedido);
        }
        return incorporados;
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
    int despacharUrgentes(List<Pedido> cola, List<UnidadEnTransito> enRuta,
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
                vehiculo.getPosicion().getUbicacion(), pedido.getDestino(), instante, vehiculo);
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
        registrarMargenes(escenario, ruta, instante, resultado);
        if (recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS] > 0) {
            registrarDetalle(escenario, ruta, instante, resultado);
        }
        ponerEnTransito(ruta, escenario, instante, recorrido[CalculadoraTiempos.INDICE_FIN], enRuta);
    }

    /**
     * Marca la unidad de una ruta como en ruta y la registra en transito con los
     * tramos que va a recorrer, para que se pueda seguir su posicion.
     *
     * @param ruta      ruta despachada
     * @param escenario escenario con la malla vigente
     * @param salida    instante de salida
     * @param libreEn   instante en que la unidad termina la ruta
     * @param enRuta    unidades en transito (se agrega la despachada)
     */
    private void ponerEnTransito(Ruta ruta, EscenarioOperativo escenario, int salida, int libreEn,
                                 List<UnidadEnTransito> enRuta) {
        ruta.getVehiculo().setEstado(EstadoVehiculo.EN_RUTA);
        enRuta.add(new UnidadEnTransito(ruta.getVehiculo(), ruta, salida, libreEn,
                CalculadoraTiempos.trazar(escenario, ruta, salida)));
    }

    /**
     * Recorre la ruta despachada y registra el margen de cada entrega respecto
     * de su hora limite. Alimenta el retraso y la holgura promedio que usa la
     * calibracion de la funcion objetivo, que necesita medir el margen por
     * entrega y no solo contar las que incumplen.
     *
     * @param escenario escenario con la malla vigente
     * @param ruta      ruta despachada
     * @param salida    instante de salida de la ruta
     * @param resultado resultado agregado a actualizar
     */
    private void registrarMargenes(EscenarioOperativo escenario, Ruta ruta, int salida,
                                   ResultadoSimulacion resultado) {
        int reloj = salida;
        int idVehiculo = ruta.getVehiculo().getId();
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (Entrega entrega : ruta.getSecuencia()) {
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj,
                    ruta.getVehiculo());
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            resultado.registrarMargenEntrega(entrega.getHoraLimite() - reloj, entrega.getCantidad());
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
    }

    /**
     * Punto de disparo de la planificacion: lo invoca tanto el paso periodico
     * como el paso que dispara un evento (pedido o averia en vivo).
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
    void despachar(SolucionRuteo plan, List<Pedido> cola, List<UnidadEnTransito> enRuta,
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
            registrarMargenes(escenario, ruta, instante, resultado);
            if (recorrido[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS] > 0) {
                registrarDetalle(escenario, ruta, instante, resultado);
            }
            resultado.sumarEntregas(ruta.getSecuencia().size());
            for (Entrega entrega : ruta.getSecuencia()) {
                despachados.add(entrega.getIdPedido());
            }
            liberadas.removeAll(ruta.getSecuencia());
            ponerEnTransito(ruta, escenario, instante, recorrido[CalculadoraTiempos.INDICE_FIN], enRuta);
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
        entregas.addAll(liberadas);
        return new EscenarioOperativo(almacenes, libres, entregas, instante,
                plazoMaximo, malla, tiempoServicio);
    }

    /**
     * Registra el detalle de los incumplimientos de una ruta para el informe y
     * declara el colapso con la primera entrega tardia. Recorre la ruta igual
     * que {@link CalculadoraTiempos#recorrer}, asi que encuentra las mismas
     * entregas que esta conto como incumplidas.
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
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj,
                    ruta.getVehiculo());
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            int holgura = entrega.getHoraLimite() - reloj;
            if (holgura < 0) {
                resultado.registrarColapso(ColapsoLogistico.porEntregaTardia(entrega.getIdPedido(), salida,
                        entrega.getHoraLimite(), reloj, ruta.getVehiculo()));
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
