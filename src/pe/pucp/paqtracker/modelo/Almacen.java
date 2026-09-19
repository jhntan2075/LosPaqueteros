package pe.pucp.paqtracker.modelo;

/**
 * Almacen desde el cual parten y al cual retornan las unidades de transporte.
 * El almacen central tiene inventario ilimitado; los almacenes intermedios
 * tienen un stock acotado que se descuenta al despachar desde ellos y se
 * recarga a su capacidad maxima cada 24 horas a las 23:59:59.
 */
public final class Almacen {

    private final int id;
    private final Nodo ubicacion;
    private final boolean ilimitado;
    private final int capacidadMaxima;
    private int stockDisponible;

    /**
     * Crea el almacen con su stock lleno.
     *
     * @param id              identificador del almacen
     * @param ubicacion       posicion del almacen en la malla
     * @param ilimitado       verdadero si el inventario es ilimitado (central)
     * @param capacidadMaxima stock al que se recarga cada dia (intermedios)
     */
    public Almacen(int id, Nodo ubicacion, boolean ilimitado, int capacidadMaxima) {
        this.id = id;
        this.ubicacion = ubicacion;
        this.ilimitado = ilimitado;
        this.capacidadMaxima = capacidadMaxima;
        this.stockDisponible = capacidadMaxima;
    }

    public int getId() {
        return id;
    }

    public Nodo getUbicacion() {
        return ubicacion;
    }

    public boolean esIlimitado() {
        return ilimitado;
    }

    public int getCapacidadMaxima() {
        return capacidadMaxima;
    }

    /**
     * @return stock disponible en este momento; en el central, la capacidad declarada
     */
    public int getStockDisponible() {
        return ilimitado ? capacidadMaxima : stockDisponible;
    }

    /**
     * Indica si el almacen puede despachar la cantidad pedida con su stock actual.
     *
     * @param cantidad unidades de producto a despachar
     * @return verdadero si el central o si el stock alcanza
     */
    public boolean tieneStock(int cantidad) {
        return ilimitado || stockDisponible >= cantidad;
    }

    /**
     * Descuenta del inventario la carga de una unidad que sale de este almacen.
     * En el almacen central no tiene efecto.
     *
     * @param cantidad unidades de producto cargadas
     * @throws CapacidadExcedidaException si el stock no alcanza para la carga
     */
    public void descontar(int cantidad) {
        if (ilimitado) {
            return;
        }
        if (cantidad > stockDisponible) {
            throw new CapacidadExcedidaException(String.format(
                    "Almacen %d: se piden %d y solo hay %d", id, cantidad, stockDisponible));
        }
        stockDisponible -= cantidad;
    }

    /**
     * Recarga el inventario a su capacidad maxima (recarga instantanea diaria).
     */
    public void recargar() {
        stockDisponible = capacidadMaxima;
    }

    @Override
    public String toString() {
        return "A" + id;
    }
}
