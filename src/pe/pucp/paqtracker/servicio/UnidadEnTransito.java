package pe.pucp.paqtracker.servicio;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Vehiculo;

/**
 * Registro de una unidad en transito: la unidad, el instante en que vuelve a
 * estar libre y el almacen en que quedara al terminar su ruta.
 */
public final class UnidadEnTransito {

    private final Vehiculo vehiculo;
    private final int libreEn;
    private final Almacen destino;

    /**
     * @param vehiculo unidad en transito
     * @param libreEn  instante en que termina su ruta
     * @param destino  almacen en que quedara
     */
    public UnidadEnTransito(Vehiculo vehiculo, int libreEn, Almacen destino) {
        this.vehiculo = vehiculo;
        this.libreEn = libreEn;
        this.destino = destino;
    }

    public Vehiculo getVehiculo() {
        return vehiculo;
    }

    public int getLibreEn() {
        return libreEn;
    }

    public Almacen getDestino() {
        return destino;
    }
}
