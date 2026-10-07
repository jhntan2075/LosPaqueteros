package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.List;
import java.util.Optional;

/**
 * Registro de una unidad en transito: la unidad, su salida, los tramos que
 * recorre, el instante en que vuelve a estar libre y el almacen en que quedara
 * al terminar su ruta.
 */
public final class UnidadEnTransito {

    private final Vehiculo vehiculo;
    private final Almacen origen;
    private final int salida;
    private final int libreEn;
    private final Almacen destino;
    private final List<Tramo> tramos;

    /**
     * @param vehiculo unidad en transito
     * @param origen   almacen del que sale
     * @param salida   instante de salida
     * @param libreEn  instante en que termina su ruta
     * @param destino  almacen en que quedara
     * @param tramos   tramos de la ruta en orden de recorrido
     */
    public UnidadEnTransito(Vehiculo vehiculo, Almacen origen, int salida, int libreEn,
                            Almacen destino, List<Tramo> tramos) {
        this.vehiculo = vehiculo;
        this.origen = origen;
        this.salida = salida;
        this.libreEn = libreEn;
        this.destino = destino;
        this.tramos = List.copyOf(tramos);
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
