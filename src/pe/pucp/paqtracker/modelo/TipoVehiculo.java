package pe.pucp.paqtracker.modelo;

/**
 * Tipo de unidad de transporte de la flota heterogenea. Cada tipo define su
 * capacidad de carga y su velocidad de desplazamiento. Los valores corresponden
 * a los datos oficiales del proyecto.
 *
 * Analisis de sensibilidad de velocidades (16-09-2026), por si el proyecto
 * redefine estos valores. La configuracion oficial deja al AUTO como la unica
 * unidad de capacidad mayor a 8 y a la vez una de las mas lentas, de modo que
 * todo pedido urgente de cantidad alta queda obligado a la unidad lenta:
 *
 * - Oficial (BICICLETA 14, MOTOCICLETA 40, AUTO 20): en octubre 2026 deja 6
 *   incumplimientos, todos en AUTO, y el colapso ocurre el dia 3.
 * - Variante evaluada (BICICLETA 12, MOTOCICLETA 25, AUTO 40): en octubre 2026
 *   deja cero incumplimientos y sin colapso, con 2,5% menos de distancia. Pierde
 *   solo en sobrecarga extrema (712 pedidos/dia), donde acelerar 10 autos no
 *   compensa frenar las 27 unidades restantes y el caudal agregado de la flota
 *   cae de 30,0 a 26,1 km/h efectivos.
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
