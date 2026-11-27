package pe.pucp.paqtracker.modelo;

/**
 * Ventana de mantenimiento preventivo de una unidad, en minutos de la linea de tiempo de la simulacion:
 * la unidad no se planifica en {@code [inicio, fin)}.
 *
 * @param idVehiculo identificador de la unidad en la flota de la simulacion
 * @param inicio     primer minuto en el taller (la medianoche de su fecha)
 * @param fin        primer minuto en que vuelve a estar disponible (la medianoche siguiente)
 */
public record MantenimientoProgramado(int idVehiculo, int inicio, int fin) {

    /**
     * @throws IllegalArgumentException si la ventana esta vacia
     */
    public MantenimientoProgramado {
        if (fin <= inicio) {
            throw new IllegalArgumentException("Mantenimiento sin duracion para la unidad " + idVehiculo
                    + ": [" + inicio + ", " + fin + ")");
        }
    }

    /**
     * @param instante minuto de la simulacion
     * @return verdadero si la unidad esta en el taller en ese minuto
     */
    public boolean vigenteEn(int instante) {
        return instante >= inicio && instante < fin;
    }
}
