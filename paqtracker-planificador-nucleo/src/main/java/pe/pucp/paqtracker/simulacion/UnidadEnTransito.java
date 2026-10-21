package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Registro de una unidad en transito: la unidad, la ruta que ejecuta y su
 * salida (para poder reconstruir, ante una averia, que entregas ya completo y
 * donde quedo), los tramos que recorre, el instante en que vuelve a estar
 * libre y el almacen en que quedara al terminar su ruta.
 */
public final class UnidadEnTransito {

    private final Vehiculo vehiculo;
    private final Ruta ruta;
    private final Almacen origen;
    private final int salida;
    private final int libreEn;
    private final Almacen destino;
    private final List<Tramo> tramos;

    /**
     * @param vehiculo unidad en transito
     * @param ruta     ruta que la unidad esta ejecutando; de ella se toman el almacen de origen y el de destino
     * @param salida   instante absoluto en que salio del almacen de origen
     * @param libreEn  instante en que termina su ruta
     * @param tramos   tramos de la ruta en orden de recorrido
     */
    public UnidadEnTransito(Vehiculo vehiculo, Ruta ruta, int salida, int libreEn, List<Tramo> tramos) {
        this.vehiculo = vehiculo;
        this.ruta = ruta;
        this.origen = ruta.getOrigen();
        this.salida = salida;
        this.libreEn = libreEn;
        this.destino = ruta.getDestino();
        this.tramos = List.copyOf(tramos);
    }

    /**
     * Lo que la unidad hizo y lo que le faltaba hacer al cortar su recorrido en un instante.
     *
     * @param ubicacion             nodo en que se encuentra la unidad en ese instante
     * @param entregasPendientes    entregas de la ruta cuya llegada es posterior al corte, en orden
     * @param tramosPendientes      tramos de esas entregas, en el mismo orden
     * @param kilometrosRecorridos  kilometros recorridos hasta el corte
     * @param kilometrosTotales     kilometros de todo el recorrido, tal como se contaron al despachar
     */
    public record Corte(Nodo ubicacion, List<Entrega> entregasPendientes, List<Tramo> tramosPendientes,
                        int kilometrosRecorridos, int kilometrosTotales) {
    }

    /**
     * Corta el recorrido en un instante a partir de sus tramos, que son la verdad de lo que la unidad
     * hace (incluidas las detenciones previas). Una entrega cuenta como hecha si la unidad ya llego a
     * su destino, igual que al reportar entregas completadas; la ubicacion es el punto exacto del
     * camino en ese instante.
     *
     * @param instante instante del corte
     * @return ubicacion, entregas pendientes y kilometros del recorrido
     */
    public Corte cortarEn(int instante) {
        List<Entrega> secuencia = ruta.getSecuencia();
        List<Entrega> pendientes = new ArrayList<>();
        List<Tramo> tramosPendientes = new ArrayList<>();
        int recorridos = 0;
        int totales = 0;
        int indiceEntrega = 0;
        for (Tramo tramo : tramos) {
            totales += tramo.getDistancia();
            recorridos += tramo.getLlegada() <= instante ? tramo.getDistancia()
                    : Math.min(tramo.getDistancia(), tramo.kilometrosEn(instante));
            if (tramo.esEntrega()) {
                if (tramo.getLlegada() > instante) {
                    pendientes.add(secuencia.get(indiceEntrega));
                    tramosPendientes.add(tramo);
                }
                indiceEntrega++;
            }
        }
        return new Corte(ubicacionEn(instante), pendientes, tramosPendientes, recorridos, totales);
    }

    /**
     * Detiene la unidad en un instante durante los minutos indicados, conservando su carga: lo ya
     * recorrido no cambia, el tramo en curso se parte en el punto de la detencion y todo lo que falta
     * se desplaza esos minutos. No recalcula bloqueos ni refrigerio sobre el tramo desplazado.
     *
     * @param instante instante en que se detiene
     * @param minutos  duracion de la detencion
     * @return el mismo transito con la detencion intercalada y su fin desplazado
     */
    public UnidadEnTransito detenerEn(int instante, int minutos) {
        List<Tramo> nuevos = new ArrayList<>();
        boolean detenida = false;
        for (Tramo tramo : tramos) {
            if (tramo.getLlegada() <= instante) {
                nuevos.add(tramo);
            } else if (tramo.getSalida() >= instante) {
                if (!detenida) {
                    nuevos.add(detencion(tramo.getOrigen(), instante, minutos));
                    detenida = true;
                }
                nuevos.add(tramo.desplazar(minutos));
            } else {
                nuevos.add(tramo.recortarHasta(instante));
                nuevos.add(detencion(tramo.ubicacionEn(instante), instante, minutos));
                nuevos.add(tramo.restoDesde(instante, minutos));
                detenida = true;
            }
        }
        if (!detenida) {
            nuevos.add(detencion(ubicacionEn(instante), instante, minutos));
        }
        return new UnidadEnTransito(vehiculo, ruta, salida, Math.max(libreEn, instante) + minutos, nuevos);
    }

    /**
     * @param instante instante a consultar
     * @return punto de la malla en que esta la unidad: sobre su tramo en curso, en el origen si aun no
     *         sale o en el almacen de destino si ya termino
     */
    public Nodo ubicacionEn(int instante) {
        Optional<Tramo> enCurso = tramoEnCurso(instante);
        if (enCurso.isPresent()) {
            return enCurso.get().ubicacionEn(instante);
        }
        return instante < salida ? origen.getUbicacion() : destino.getUbicacion();
    }

    /**
     * @return llegada de cada entrega de la ruta a su destino, segun los tramos (por identidad de la entrega)
     */
    public Map<Entrega, Integer> llegadasPorEntrega() {
        Map<Entrega, Integer> llegadas = new IdentityHashMap<>();
        List<Entrega> secuencia = ruta.getSecuencia();
        int indiceEntrega = 0;
        for (Tramo tramo : tramos) {
            if (tramo.esEntrega()) {
                llegadas.put(secuencia.get(indiceEntrega++), tramo.getLlegada());
            }
        }
        return llegadas;
    }

    /**
     * @param instante instante del corte
     * @return tramos ya recorridos en ese instante, con el tramo en curso recortado hasta el punto
     */
    List<Tramo> tramosHasta(int instante) {
        List<Tramo> recorridos = new ArrayList<>();
        for (Tramo tramo : tramos) {
            if (tramo.getLlegada() <= instante) {
                recorridos.add(tramo);
            } else if (tramo.getSalida() < instante) {
                recorridos.add(tramo.recortarHasta(instante));
            }
        }
        return recorridos;
    }

    /**
     * @param punto    nodo en que la unidad queda detenida
     * @param instante inicio de la detencion
     * @param minutos  duracion de la detencion
     * @return tramo de detencion por averia, sin pedido
     */
    static Tramo detencion(Nodo punto, int instante, int minutos) {
        return new Tramo(TipoTramo.AVERIA, punto, punto, instante, instante + minutos, 0, Tramo.SIN_PEDIDO, 0,
                List.of(punto));
    }

    /**
     * Busca el tramo que la unidad recorre en un instante dado.
     *
     * @param instante instante a consultar
     * @return tramo en curso, o vacio si la unidad aun no sale o ya termino
     */
    public Optional<Tramo> tramoEnCurso(int instante) {
        for (Tramo tramo : tramos) {
            if (tramo.estaEnCurso(instante)) {
                return Optional.of(tramo);
            }
        }
        return Optional.empty();
    }

    public Vehiculo getVehiculo() {
        return vehiculo;
    }

    public Ruta getRuta() {
        return ruta;
    }

    public Almacen getOrigen() {
        return origen;
    }

    public int getSalida() {
        return salida;
    }

    public int getLibreEn() {
        return libreEn;
    }

    public Almacen getDestino() {
        return destino;
    }

    /**
     * @return tramos de la ruta en orden de recorrido, inmodificables
     */
    public List<Tramo> getTramos() {
        return tramos;
    }
}
