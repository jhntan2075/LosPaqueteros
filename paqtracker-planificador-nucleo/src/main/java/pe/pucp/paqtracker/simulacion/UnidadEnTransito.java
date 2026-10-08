package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.List;
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
