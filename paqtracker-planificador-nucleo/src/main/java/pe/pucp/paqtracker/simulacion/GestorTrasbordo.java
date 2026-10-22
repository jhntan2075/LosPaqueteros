package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.TipoAveria;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Decide que entregas de una unidad averiada en ruta se trasvasan a otras unidades en ruta (criterios del
 * equipo del 22-10-2026 sobre la indicacion del profesor). En tipo 1 solo se rescata lo que, esperando las
 * 2 h, llegaria tarde; en tipo 2 y 3 todo lo pendiente, porque la unidad no se recupera en el lugar.
 *
 * Las receptoras se preseleccionan con distancia Manhattan: espacio libre a bordo, llegada al punto con
 * tiempo para terminar el trasvase antes de que la averiada se vaya (reanuda en tipo 1, pasa al central en
 * tipo 2 y 3) y holgura propia que cubra el desvio. De ellas se evaluan solo las
 * {@link #MAXIMO_CANDIDATAS} que llegan antes, trazando con A*. Cada entrega va a la receptora que la
 * entrega antes, solo si llega a tiempo y las entregas propias de la receptora que iban a tiempo siguen a
 * tiempo (LE-041). Lo que no se trasvasa lo resuelve el orquestador con una salida desde un almacen.
 *
 * Corre fuera de la metaheuristica, como el despacho directo, para no alterar los bloques compartidos con
 * que se comparan el GA y el IACO.
 */
final class GestorTrasbordo {

    /** Receptoras que se evaluan con el trazado exacto, entre las preseleccionadas que llegan antes. */
    static final int MAXIMO_CANDIDATAS = 5;

    private static final int TRASVASE = ConfiguracionDominio.TRASVASE_MINUTOS;
    private static final int DETENCION_TIPO1 = ConfiguracionDominio.AVERIA_TIPO1_MINUTOS;

    private final EscenarioOperativo escenario;

    /**
     * Entregas trasvasadas y las que necesitaban rescate pero ninguna receptora pudo llevar a tiempo.
     *
     * @param ubicacion  punto de la malla en que quedo la averiada
     * @param trasbordos trasvases decididos, uno por receptora
     * @param sinRescate entregas a rescatar que no se trasvasaron, por hora limite
     */
    record Decision(Nodo ubicacion, List<Trasbordo> trasbordos, List<Entrega> sinRescate) {
    }

    /**
     * @param escenario escenario con la malla vigente, para distancias y caminos
     */
    GestorTrasbordo(EscenarioOperativo escenario) {
        this.escenario = escenario;
    }

    /**
     * @param transito       recorrido que la unidad ejecutaba al averiarse
     * @param tipo           tipo de la averia
     * @param instanteAveria instante de la averia
     * @param salida         instante desde el que las receptoras se desvian (el del paso que aplica la averia)
     * @param enRuta         unidades en transito, de donde salen las receptoras; no se modifica
     * @return trasvases decididos y entregas que quedan sin rescate
     */
    Decision decidir(UnidadEnTransito transito, TipoAveria tipo, int instanteAveria, int salida,
                     List<UnidadEnTransito> enRuta) {
        Nodo punto = transito.ubicacionEn(instanteAveria);
        int partida = instanteAveria + (tipo == TipoAveria.TIPO_1
                ? DETENCION_TIPO1 : ConfiguracionDominio.AVERIA_PERMANENCIA_SITIO_MINUTOS);
        List<Entrega> porRescatar = porRescatar(transito, tipo, instanteAveria);
        List<Receptora> receptoras = trasvasar(porRescatar, transito.getVehiculo(), punto, partida, salida,
                enRuta);
        List<Trasbordo> trasbordos = new ArrayList<>();
        Set<Entrega> trasvasadas = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Receptora receptora : receptoras) {
            if (!receptora.asignadas.isEmpty()) {
                trasbordos.add(receptora.aTrasbordo(punto));
                trasvasadas.addAll(receptora.asignadas);
            }
        }
        List<Entrega> sinRescate = porRescatar.stream().filter(entrega -> !trasvasadas.contains(entrega)).toList();
        return new Decision(punto, trasbordos, sinRescate);
    }

    /**
     * Recorrido de una averiada tipo 1 sin las entregas que dejo de llevar: lo ya recorrido, la detencion de
     * 2 h y, desde el punto, lo que le queda y su almacen de destino. Sin entregas, es solo la vuelta.
     *
     * @param transito       recorrido que la unidad ejecutaba al averiarse
     * @param instanteAveria instante de la averia
     * @param quitadas       entregas que se trasvasaron o salieron en una unidad de respaldo
     * @return recorrido con que la unidad sigue tras la detencion
     */
    UnidadEnTransito reanudar(UnidadEnTransito transito, int instanteAveria, Set<Entrega> quitadas) {
        if (quitadas.isEmpty()) {
            return transito.detenerEn(instanteAveria, DETENCION_TIPO1);
        }
        Set<Entrega> pendientes = identidad(transito.cortarEn(instanteAveria).entregasPendientes());
        List<Entrega> secuencia = new ArrayList<>();
        List<Entrega> restantes = new ArrayList<>();
        for (Entrega entrega : transito.getRuta().getSecuencia()) {
            if (!pendientes.contains(entrega)) {
                secuencia.add(entrega);
            } else if (!quitadas.contains(entrega)) {
                restantes.add(entrega);
            }
        }
        secuencia.addAll(restantes);
        Vehiculo vehiculo = transito.getVehiculo();
        Nodo punto = transito.ubicacionEn(instanteAveria);
        List<Tramo> tramos = transito.tramosHasta(instanteAveria);
        tramos.add(UnidadEnTransito.detencion(punto, instanteAveria, DETENCION_TIPO1));
        tramos.addAll(CalculadoraTiempos.trazarDesde(escenario, vehiculo, punto, restantes,
                transito.getDestino().getUbicacion(), instanteAveria + DETENCION_TIPO1));
        Ruta ruta = new Ruta(vehiculo, transito.getOrigen());
        ruta.getSecuencia().addAll(secuencia);
        ruta.setDestino(transito.getDestino());
        return new UnidadEnTransito(vehiculo, ruta, transito.getSalida(), tramos.get(tramos.size() - 1).getLlegada(),
                tramos);
    }

    /**
     * Tipo 1: las entregas que llegarian tarde esperando las 2 h. Tipo 2 y 3: todas las pendientes.
     */
    private static List<Entrega> porRescatar(UnidadEnTransito transito, TipoAveria tipo, int instanteAveria) {
        List<Entrega> pendientes = new ArrayList<>(transito.cortarEn(instanteAveria).entregasPendientes());
        if (tipo == TipoAveria.TIPO_1) {
            Map<Entrega, Integer> esperando = transito.detenerEn(instanteAveria, DETENCION_TIPO1).llegadasPorEntrega();
            pendientes.removeIf(entrega -> esperando.get(entrega) <= entrega.getHoraLimite());
        }
        pendientes.sort(Comparator.comparingInt(Entrega::getHoraLimite));
        return pendientes;
    }

    /**
     * Asigna cada entrega, por hora limite, a la receptora que la entrega antes entre las que la llevan a
     * tiempo; si ninguna puede, queda sin rescate.
     */
    private List<Receptora> trasvasar(List<Entrega> porRescatar, Vehiculo averiada, Nodo punto, int partida,
                                      int salida, List<UnidadEnTransito> enRuta) {
        if (porRescatar.isEmpty()) {
            return List.of();
        }
        int menorCarga = porRescatar.stream().mapToInt(Entrega::getCantidad).min().orElse(0);
        List<Receptora> receptoras = preseleccionar(averiada, punto, partida, salida, menorCarga, enRuta);
        for (Entrega entrega : porRescatar) {
            Receptora mejor = null;
            UnidadEnTransito planMejor = null;
            for (Receptora receptora : receptoras) {
                UnidadEnTransito plan = receptora.planCon(entrega);
                if (plan != null && (planMejor == null
                        || plan.llegadasPorEntrega().get(entrega) < planMejor.llegadasPorEntrega().get(entrega))) {
                    mejor = receptora;
                    planMejor = plan;
                }
            }
            if (mejor != null) {
                mejor.aceptar(entrega, planMejor);
            }
        }
        return receptoras;
    }

    /**
     * Filtro barato con distancia Manhattan; se queda con las {@link #MAXIMO_CANDIDATAS} que llegan antes.
     */
    private List<Receptora> preseleccionar(Vehiculo averiada, Nodo punto, int partida, int salida, int menorCarga,
                                           List<UnidadEnTransito> enRuta) {
        List<Receptora> receptoras = new ArrayList<>();
        for (UnidadEnTransito unidad : enRuta) {
            Vehiculo vehiculo = unidad.getVehiculo();
            int inicio = inicioDesvio(unidad, salida);
            if (vehiculo == averiada || vehiculo.getEstado() != EstadoVehiculo.EN_RUTA
                    || unidad.getLibreEn() <= inicio || tieneTrasvasePendiente(unidad, inicio)) {
                continue;
            }
            Receptora receptora = new Receptora(unidad, inicio, punto, partida);
            int viaje = CalculadoraTiempos.minutosDeViaje(receptora.posicion.distanciaManhattan(punto),
                    vehiculo.getTipo());
            if (vehiculo.getCapacidad() - receptora.carga >= menorCarga
                    && inicio + viaje + TRASVASE <= partida
                    && receptora.holguraMinima() >= 2 * viaje + TRASVASE) {
                receptora.llegadaEstimada = inicio + viaje;
                receptoras.add(receptora);
            }
        }
        receptoras.sort(Comparator.comparingInt((Receptora receptora) -> receptora.llegadaEstimada)
                .thenComparingInt(receptora -> receptora.transito.getVehiculo().getId()));
        return receptoras.size() > MAXIMO_CANDIDATAS ? receptoras.subList(0, MAXIMO_CANDIDATAS) : receptoras;
    }

    /** Una unidad que esta acondicionando una entrega termina antes de desviarse. */
    private static int inicioDesvio(UnidadEnTransito unidad, int salida) {
        Optional<Tramo> enCurso = unidad.tramoEnCurso(salida);
        return enCurso.filter(tramo -> tramo.getTipo() == TipoTramo.SERVICIO).map(Tramo::getLlegada).orElse(salida);
    }

    /** Una unidad que ya va a otro trasvase no se desvia de nuevo. */
    private static boolean tieneTrasvasePendiente(UnidadEnTransito unidad, int inicio) {
        return unidad.getTramos().stream().anyMatch(tramo -> tramo.getLlegada() > inicio
                && (tramo.getTipo() == TipoTramo.VIAJE_A_TRASBORDO || tramo.getTipo() == TipoTramo.TRASVASE));
    }

    private static Set<Entrega> identidad(List<Entrega> entregas) {
        Set<Entrega> conjunto = Collections.newSetFromMap(new IdentityHashMap<>());
        conjunto.addAll(entregas);
        return conjunto;
    }

    /**
     * Unidad en ruta candidata a recibir carga: su estado al desviarse y lo que ya se le asigno.
     */
    private final class Receptora {

        private final UnidadEnTransito transito;
        private final int inicio;
        private final Nodo posicion;
        private final Nodo punto;
        private final int partida;
        private final List<Entrega> propias;
        private final Map<Entrega, Integer> llegadasPrevias = new IdentityHashMap<>();
        private final int carga;
        private final List<Entrega> asignadas = new ArrayList<>();
        private UnidadEnTransito plan;
        private int llegadaEstimada;

        Receptora(UnidadEnTransito transito, int inicio, Nodo punto, int partida) {
            this.transito = transito;
            this.inicio = inicio;
            this.posicion = transito.ubicacionEn(inicio);
            this.punto = punto;
            this.partida = partida;
            UnidadEnTransito.Corte corte = transito.cortarEn(inicio);
            this.propias = corte.entregasPendientes();
            for (int i = 0; i < propias.size(); i++) {
                llegadasPrevias.put(propias.get(i), corte.tramosPendientes().get(i).getLlegada());
            }
            this.carga = propias.stream().mapToInt(Entrega::getCantidad).sum();
        }

        /** Menor holgura entre sus entregas pendientes; sin entregas, no tiene nada que perder. */
        int holguraMinima() {
            return propias.stream().mapToInt(entrega -> entrega.getHoraLimite() - llegadasPrevias.get(entrega))
                    .min().orElse(Integer.MAX_VALUE);
        }

        void aceptar(Entrega entrega, UnidadEnTransito nuevoPlan) {
            asignadas.add(entrega);
            plan = nuevoPlan;
        }

        Trasbordo aTrasbordo(Nodo puntoTrasvase) {
            Set<Entrega> mias = identidad(asignadas);
            List<Entrega> enOrden = plan.getRuta().getSecuencia().stream().filter(mias::contains).toList();
            int recojo = plan.getTramos().stream().filter(tramo -> tramo.getTipo() == TipoTramo.TRASVASE)
                    .findFirst().orElseThrow().getSalida();
            return new Trasbordo(plan, enOrden, puntoTrasvase, recojo);
        }

        /**
         * Recorrido con el desvio y la entrega agregada a lo ya asignado, o null si no cabe, si el trasvase
         * no termina antes de que la averiada se vaya o si alguna entrega queda tarde.
         */
        UnidadEnTransito planCon(Entrega entrega) {
            List<Entrega> rescatadas = new ArrayList<>(asignadas);
            rescatadas.add(entrega);
            int cargaTotal = carga + rescatadas.stream().mapToInt(Entrega::getCantidad).sum();
            Vehiculo vehiculo = transito.getVehiculo();
            if (cargaTotal > vehiculo.getCapacidad()) {
                return null;
            }
            Tramo ida = CalculadoraTiempos.trazarViaje(escenario, vehiculo, posicion, punto,
                    TipoTramo.VIAJE_A_TRASBORDO, inicio);
            int finTrasvase = ida.getLlegada() + TRASVASE;
            if (finTrasvase > partida) {
                return null;
            }
            UnidadEnTransito nuevo = trazar(ida, insertar(rescatadas, finTrasvase), finTrasvase);
            return cumplePlazos(nuevo, rescatadas) ? nuevo : null;
        }

        private UnidadEnTransito trazar(Tramo ida, List<Entrega> secuencia, int finTrasvase) {
            Vehiculo vehiculo = transito.getVehiculo();
            List<Tramo> tramos = transito.tramosHasta(inicio);
            tramos.add(ida);
            tramos.add(new Tramo(TipoTramo.TRASVASE, punto, punto, ida.getLlegada(), finTrasvase, 0,
                    Tramo.SIN_PEDIDO, 0, List.of(punto)));
            tramos.addAll(CalculadoraTiempos.trazarDesde(escenario, vehiculo, punto, secuencia,
                    transito.getDestino().getUbicacion(), finTrasvase));
            Set<Entrega> pendientes = identidad(propias);
            Ruta ruta = new Ruta(vehiculo, transito.getOrigen());
            transito.getRuta().getSecuencia().stream().filter(hecha -> !pendientes.contains(hecha))
                    .forEach(ruta.getSecuencia()::add);
            ruta.getSecuencia().addAll(secuencia);
            ruta.setDestino(transito.getDestino());
            return new UnidadEnTransito(vehiculo, ruta, transito.getSalida(),
                    tramos.get(tramos.size() - 1).getLlegada(), tramos);
        }

        /** Las rescatadas llegan a tiempo y las propias que iban a tiempo siguen a tiempo. */
        private boolean cumplePlazos(UnidadEnTransito nuevo, List<Entrega> rescatadas) {
            Map<Entrega, Integer> llegadas = nuevo.llegadasPorEntrega();
            for (Entrega entrega : rescatadas) {
                if (llegadas.get(entrega) > entrega.getHoraLimite()) {
                    return false;
                }
            }
            for (Entrega entrega : propias) {
                boolean ibaATiempo = llegadasPrevias.get(entrega) <= entrega.getHoraLimite();
                if (ibaATiempo && llegadas.get(entrega) > entrega.getHoraLimite()) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Inserta las rescatadas, por hora limite, en la posicion de las propias que menos entregas deja tarde
         * y, a igualdad, menos kilometros agrega, estimando con Manhattan desde el punto del trasvase.
         */
        private List<Entrega> insertar(List<Entrega> rescatadas, int finTrasvase) {
            List<Entrega> secuencia = new ArrayList<>(propias);
            List<Entrega> enOrden = new ArrayList<>(rescatadas);
            enOrden.sort(Comparator.comparingInt(Entrega::getHoraLimite));
            for (Entrega entrega : enOrden) {
                int mejorPosicion = 0;
                long mejorCosto = Long.MAX_VALUE;
                for (int posicion = 0; posicion <= secuencia.size(); posicion++) {
                    secuencia.add(posicion, entrega);
                    long costo = costoEstimado(secuencia, finTrasvase);
                    secuencia.remove(posicion);
                    if (costo < mejorCosto) {
                        mejorCosto = costo;
                        mejorPosicion = posicion;
                    }
                }
                secuencia.add(mejorPosicion, entrega);
            }
            return secuencia;
        }

        /** Entregas tarde estimadas, como criterio principal, y kilometros recorridos como desempate. */
        private long costoEstimado(List<Entrega> secuencia, int finTrasvase) {
            Vehiculo vehiculo = transito.getVehiculo();
            int reloj = finTrasvase;
            int kilometros = 0;
            int tarde = 0;
            Nodo actual = punto;
            for (Entrega entrega : secuencia) {
                int tramo = actual.distanciaManhattan(entrega.getDestino());
                kilometros += tramo;
                reloj += CalculadoraTiempos.minutosDeViaje(tramo, vehiculo.getTipo());
                if (reloj > entrega.getHoraLimite()) {
                    tarde++;
                }
                reloj += escenario.getTiempoServicio();
                actual = entrega.getDestino();
            }
            return (long) tarde * Integer.MAX_VALUE + kilometros;
        }
    }
}
