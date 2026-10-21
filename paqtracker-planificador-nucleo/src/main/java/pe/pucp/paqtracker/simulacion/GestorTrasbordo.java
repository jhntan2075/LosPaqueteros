package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.comun.EvaluadorFitness;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Decide que hace con su carga una unidad con averia tipo 1 en ruta (indicacion del profesor del
 * 08-10-2026; criterios del equipo del 21-10-2026). Una entrega es urgente si, esperando las 2 h, su
 * holgura queda bajo el umbral de la funcion de aptitud. Las urgentes se trasbordan a una unidad libre en
 * un almacen que sale en el instante de la averia, llega al punto antes de que la averiada reanude, recoge
 * la carga (carga y descarga despreciables) y la entrega; solo se trasborda lo que asi llega antes que
 * esperando, aunque tambien llegue tarde. El resto sigue a bordo y la averiada retoma su ruta a las 2 h;
 * si se quedo sin carga, vuelve a su almacen de destino.
 *
 * Corre fuera de la metaheuristica, como el despacho directo, para no alterar los bloques compartidos con
 * que se comparan el GA y el IACO.
 */
final class GestorTrasbordo {

    private static final int DETENCION = ConfiguracionDominio.AVERIA_TIPO1_MINUTOS;

    /** Prefiere la receptora con menos entregas tarde, luego menos retraso total, luego la que termina antes. */
    private static final Comparator<UnidadEnTransito> PREFERENCIA = Comparator
            .comparingInt(GestorTrasbordo::entregasTarde)
            .thenComparingLong(GestorTrasbordo::retrasoTotal)
            .thenComparingInt(UnidadEnTransito::getLibreEn)
            .thenComparingInt(receptora -> receptora.getVehiculo().getCapacidad());

    private final EscenarioOperativo escenario;
    private final List<Vehiculo> flota;
    private final Function<Nodo, Almacen> almacenDeRetorno;

    /**
     * Recorrido con que sigue la unidad averiada y trasbordos decididos.
     *
     * @param averiada   recorrido de la unidad averiada: detencion y lo que le queda a bordo
     * @param trasbordos trasbordos a unidades libres; vacio si todo sigue a bordo
     */
    record Decision(UnidadEnTransito averiada, List<Trasbordo> trasbordos) {
    }

    /**
     * @param escenario        escenario con la malla vigente, para distancias y caminos
     * @param flota            flota completa; solo se usan como receptoras las libres en un almacen
     * @param almacenDeRetorno almacen al que vuelve una receptora segun el destino de su ultima entrega
     */
    GestorTrasbordo(EscenarioOperativo escenario, List<Vehiculo> flota, Function<Nodo, Almacen> almacenDeRetorno) {
        this.escenario = escenario;
        this.flota = flota;
        this.almacenDeRetorno = almacenDeRetorno;
    }

    /**
     * @param transito         recorrido que la unidad ejecutaba al averiarse
     * @param instanteAveria   instante de la averia
     * @param salidaReceptoras instante en que salen las receptoras (el del paso que aplica la averia)
     * @return recorrido de la averiada y trasbordos decididos
     */
    Decision decidir(UnidadEnTransito transito, int instanteAveria, int salidaReceptoras) {
        UnidadEnTransito esperando = transito.detenerEn(instanteAveria, DETENCION);
        Map<Entrega, Integer> llegadaEsperando = esperando.llegadasPorEntrega();
        List<Entrega> urgentes = new ArrayList<>();
        for (Entrega entrega : esperando.cortarEn(instanteAveria).entregasPendientes()) {
            if (entrega.getHoraLimite() - llegadaEsperando.get(entrega) < EvaluadorFitness.UMBRAL_HOLGURA_MINUTOS) {
                urgentes.add(entrega);
            }
        }
        urgentes.sort(Comparator.comparingInt(Entrega::getHoraLimite));
        Nodo punto = transito.ubicacionEn(instanteAveria);
        List<Trasbordo> trasbordos = asignarReceptoras(urgentes, punto, instanteAveria + DETENCION,
                salidaReceptoras, llegadaEsperando);
        if (trasbordos.isEmpty()) {
            return new Decision(esperando, List.of());
        }
        return new Decision(reanudarSin(transito, instanteAveria, punto, trasbordos), trasbordos);
    }

    /**
     * Reparte las urgentes, por hora limite, en grupos que quepan en una receptora y busca una para cada
     * grupo. Cada unidad recibe a lo sumo un trasbordo.
     */
    private List<Trasbordo> asignarReceptoras(List<Entrega> urgentes, Nodo punto, int partida, int salida,
                                              Map<Entrega, Integer> llegadaEsperando) {
        List<Trasbordo> trasbordos = new ArrayList<>();
        Set<Vehiculo> usadas = Collections.newSetFromMap(new IdentityHashMap<>());
        List<Entrega> porAsignar = new ArrayList<>(urgentes);
        int capacidad = capacidadLibreMaxima(usadas);
        while (!porAsignar.isEmpty() && capacidad > 0) {
            List<Entrega> grupo = tomarGrupo(porAsignar, capacidad);
            porAsignar.removeAll(grupo);
            Trasbordo trasbordo = rescatar(grupo, punto, partida, salida, llegadaEsperando, usadas);
            if (trasbordo != null) {
                trasbordos.add(trasbordo);
                usadas.add(trasbordo.receptora().getVehiculo());
            }
            capacidad = capacidadLibreMaxima(usadas);
        }
        return trasbordos;
    }

    /**
     * Busca la mejor receptora para un grupo y se queda solo con las entregas que ella lleva antes que la
     * averiada esperando; si descarta alguna, vuelve a trazar sin ella, porque el recorrido cambia.
     *
     * @return trasbordo del grupo, o null si ninguna receptora mejora ninguna entrega
     */
    private Trasbordo rescatar(List<Entrega> grupo, Nodo punto, int partida, int salida,
                               Map<Entrega, Integer> llegadaEsperando, Set<Vehiculo> usadas) {
        List<Entrega> candidatas = new ArrayList<>(grupo);
        while (!candidatas.isEmpty()) {
            UnidadEnTransito receptora = mejorReceptora(candidatas, punto, partida, salida, usadas);
            if (receptora == null) {
                return null;
            }
            Map<Entrega, Integer> llegadas = receptora.llegadasPorEntrega();
            List<Entrega> mejoradas = candidatas.stream()
                    .filter(entrega -> llegadas.get(entrega) < llegadaEsperando.get(entrega)).toList();
            if (mejoradas.size() == candidatas.size()) {
                return new Trasbordo(receptora, candidatas, punto);
            }
            candidatas = new ArrayList<>(mejoradas);
        }
        return null;
    }

    private UnidadEnTransito mejorReceptora(List<Entrega> entregas, Nodo punto, int partida, int salida,
                                            Set<Vehiculo> usadas) {
        int carga = entregas.stream().mapToInt(Entrega::getCantidad).sum();
        UnidadEnTransito mejor = null;
        for (Vehiculo vehiculo : flota) {
            if (!vehiculo.estaDisponible() || usadas.contains(vehiculo) || vehiculo.getCapacidad() < carga) {
                continue;
            }
            UnidadEnTransito candidata = trazarReceptora(vehiculo, entregas, punto, partida, salida);
            if (candidata != null && (mejor == null || PREFERENCIA.compare(candidata, mejor) < 0)) {
                mejor = candidata;
            }
        }
        return mejor;
    }

    /**
     * Recorrido de una receptora: de su almacen al punto de la averia, y de ahi a las entregas y a su
     * almacen de retorno.
     *
     * @return el recorrido, o null si no llega al punto antes de que la averiada reanude
     */
    private UnidadEnTransito trazarReceptora(Vehiculo vehiculo, List<Entrega> entregas, Nodo punto, int partida,
                                             int salida) {
        Tramo ida = CalculadoraTiempos.trazarViaje(escenario, vehiculo, vehiculo.getPosicion().getUbicacion(),
                punto, TipoTramo.VIAJE_A_TRASBORDO, salida);
        if (ida.getLlegada() > partida) {
            return null;
        }
        Almacen destino = almacenDeRetorno.apply(entregas.get(entregas.size() - 1).getDestino());
        List<Tramo> tramos = new ArrayList<>();
        tramos.add(ida);
        tramos.addAll(CalculadoraTiempos.trazarDesde(escenario, vehiculo, punto, entregas, destino.getUbicacion(),
                ida.getLlegada()));
        Ruta ruta = new Ruta(vehiculo, vehiculo.getPosicion());
        ruta.getSecuencia().addAll(entregas);
        ruta.setDestino(destino);
        return new UnidadEnTransito(vehiculo, ruta, salida, tramos.get(tramos.size() - 1).getLlegada(), tramos);
    }

    /**
     * Recorrido de la averiada sin lo trasbordado: lo ya recorrido, la detencion de 2 h y, desde el punto,
     * las entregas que le quedan y su almacen de destino. Sin entregas, es solo la vuelta al almacen.
     */
    private UnidadEnTransito reanudarSin(UnidadEnTransito transito, int instanteAveria, Nodo punto,
                                         List<Trasbordo> trasbordos) {
        Set<Entrega> pendientes = conjunto(transito.cortarEn(instanteAveria).entregasPendientes());
        Set<Entrega> trasbordadas = conjunto(trasbordos.stream().flatMap(t -> t.entregas().stream()).toList());
        List<Entrega> secuencia = new ArrayList<>();
        List<Entrega> restantes = new ArrayList<>();
        for (Entrega entrega : transito.getRuta().getSecuencia()) {
            if (!pendientes.contains(entrega)) {
                secuencia.add(entrega);
            } else if (!trasbordadas.contains(entrega)) {
                restantes.add(entrega);
            }
        }
        secuencia.addAll(restantes);
        Vehiculo vehiculo = transito.getVehiculo();
        List<Tramo> tramos = transito.tramosHasta(instanteAveria);
        tramos.add(UnidadEnTransito.detencion(punto, instanteAveria, DETENCION));
        tramos.addAll(CalculadoraTiempos.trazarDesde(escenario, vehiculo, punto, restantes,
                transito.getDestino().getUbicacion(), instanteAveria + DETENCION));
        Ruta ruta = new Ruta(vehiculo, transito.getOrigen());
        ruta.getSecuencia().addAll(secuencia);
        ruta.setDestino(transito.getDestino());
        return new UnidadEnTransito(vehiculo, ruta, transito.getSalida(), tramos.get(tramos.size() - 1).getLlegada(),
                tramos);
    }

    private int capacidadLibreMaxima(Set<Vehiculo> usadas) {
        return flota.stream().filter(vehiculo -> vehiculo.estaDisponible() && !usadas.contains(vehiculo))
                .mapToInt(Vehiculo::getCapacidad).max().orElse(0);
    }

    /** Toma, en orden de hora limite, las entregas que caben; si ni la primera cabe, la toma sola. */
    private static List<Entrega> tomarGrupo(List<Entrega> porAsignar, int capacidad) {
        List<Entrega> grupo = new ArrayList<>();
        int carga = 0;
        for (Entrega entrega : porAsignar) {
            if (carga + entrega.getCantidad() <= capacidad) {
                grupo.add(entrega);
                carga += entrega.getCantidad();
            }
        }
        if (grupo.isEmpty()) {
            grupo.add(porAsignar.get(0));
        }
        return grupo;
    }

    private static Set<Entrega> conjunto(List<Entrega> entregas) {
        Set<Entrega> conjunto = Collections.newSetFromMap(new IdentityHashMap<>());
        conjunto.addAll(entregas);
        return conjunto;
    }

    private static int entregasTarde(UnidadEnTransito receptora) {
        Map<Entrega, Integer> llegadas = receptora.llegadasPorEntrega();
        return (int) llegadas.entrySet().stream()
                .filter(llegada -> llegada.getValue() > llegada.getKey().getHoraLimite()).count();
    }

    private static long retrasoTotal(UnidadEnTransito receptora) {
        Map<Entrega, Integer> llegadas = receptora.llegadasPorEntrega();
        return llegadas.entrySet().stream()
                .mapToLong(llegada -> Math.max(0, llegada.getValue() - llegada.getKey().getHoraLimite())).sum();
    }
}
