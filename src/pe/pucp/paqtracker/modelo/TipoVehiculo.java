package pe.pucp.paqtracker.modelo;

/**
 * Tipo de unidad de transporte de la flota heterogenea. Cada tipo define su
 * capacidad de carga y su velocidad de desplazamiento. Los valores corresponden
 * a los datos oficiales del proyecto.
 */
public enum TipoVehiculo {

    BICICLETA(4, 14),
    MOTOCICLETA(8, 40),
    AUTO(24, 20);

    private final int capacidad;
    private final int velocidad;

    /**
     * @param capacidad unidades de producto que transporta
     * @param velocidad velocidad de desplazamiento en kilometros por hora
     */
    TipoVehiculo(int capacidad, int velocidad) {
        this.capacidad = capacidad;
        this.velocidad = velocidad;
    }

    public int getCapacidad() {
        return capacidad;
    }

    public int getVelocidad() {
        return velocidad;
    }

    /**
     * Devuelve la mayor capacidad entre todos los tipos de la flota.
     *
     * @return capacidad maxima de una unidad de la flota
     */
    public static int capacidadMaxima() {
        int maxima = 0;
        for (TipoVehiculo tipo : values()) {
            maxima = Math.max(maxima, tipo.capacidad);
        }
        return maxima;
    }
}
