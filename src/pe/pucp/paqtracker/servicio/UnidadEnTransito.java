package pe.pucp.paqtracker.servicio;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.Vehiculo;

/**
 * Registro de una unidad en transito: la unidad, la ruta que ejecuta y el
 * instante de salida (para poder reconstruir, ante una averia, que entregas
 * ya completo y donde quedo), el instante en que vuelve a estar libre y el
 * almacen en que quedara al terminar su ruta.
 */
public final class UnidadEnTransito {

    private final Vehiculo vehiculo;
    private final Ruta ruta;
    private final int salida;
    private final int libreEn;
    private final Almacen destino;

    /**
     * @param vehiculo unidad en transito
     * @param ruta     ruta que la unidad esta ejecutando
     * @param salida   instante absoluto en que salio del almacen de origen
     * @param libreEn  instante en que termina su ruta
     * @param destino  almacen en que quedara
     */
    public UnidadEnTransito(Vehiculo vehiculo, Ruta ruta, int salida, int libreEn, Almacen destino) {
        this.vehiculo = vehiculo;
        this.ruta = ruta;
        this.salida = salida;
        this.libreEn = libreEn;
        this.destino = destino;
    }

    public Vehiculo getVehiculo() {
        return vehiculo;
    }

    public Ruta getRuta() {
        return ruta;
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
}
