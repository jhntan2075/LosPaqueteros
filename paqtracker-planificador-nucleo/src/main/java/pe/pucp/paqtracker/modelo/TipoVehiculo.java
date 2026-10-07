package pe.pucp.paqtracker.modelo;

/**
 * Tipo de unidad de transporte de la flota heterogenea (patron Type Object).
 * Cada tipo define su capacidad de carga, su velocidad de desplazamiento y su
 * costo por kilometro; los valores se configuran en {@link ConfiguracionDominio}.
 *
 * Analisis de sensibilidad de velocidades (16-09-2026). La configuracion
 * anterior dejaba al AUTO como la unica unidad de capacidad mayor a 8 y a la vez
 * la mas lenta, de modo que todo pedido urgente de cantidad alta quedaba
 * obligado a la unidad lenta:
 *
 * - Anterior (BICICLETA 14, MOTOCICLETA 40, AUTO 20): en octubre 2026 deja 6
 *   incumplimientos, todos en AUTO, y el colapso ocurre el dia 3.
 * - Vigente desde el 17-09-2026 (BICICLETA 12, MOTOCICLETA 25, AUTO 40): en
 *   octubre 2026 deja cero incumplimientos y sin colapso, con 2,5% menos de
 *   distancia. Pierde solo en sobrecarga extrema (712 pedidos/dia), donde
 *   acelerar 10 autos no compensa frenar las 27 unidades restantes y el caudal
 *   agregado de la flota cae de 30,0 a 26,1 km/h efectivos.
 */
public enum TipoVehiculo {

    BICICLETA(ConfiguracionDominio.CAPACIDAD_BICICLETA, ConfiguracionDominio.VELOCIDAD_BICICLETA,
            ConfiguracionDominio.COSTO_KM_BICICLETA),
    MOTOCICLETA(ConfiguracionDominio.CAPACIDAD_MOTOCICLETA, ConfiguracionDominio.VELOCIDAD_MOTOCICLETA,
            ConfiguracionDominio.COSTO_KM_MOTOCICLETA),
    AUTO(ConfiguracionDominio.CAPACIDAD_AUTO, ConfiguracionDominio.VELOCIDAD_AUTO,
            ConfiguracionDominio.COSTO_KM_AUTO);

    private final int capacidad;
    private final int velocidad;
    private final double costoPorKm;

    /**
     * @param capacidad  unidades de producto que transporta
     * @param velocidad  velocidad de desplazamiento en kilometros por hora
     * @param costoPorKm costo por kilometro recorrido
     */
    TipoVehiculo(int capacidad, int velocidad, double costoPorKm) {
        this.capacidad = capacidad;
        this.velocidad = velocidad;
        this.costoPorKm = costoPorKm;
    }

    public int getCapacidad() {
        return capacidad;
    }

    public int getVelocidad() {
        return velocidad;
    }

    public double getCostoPorKm() {
        return costoPorKm;
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
