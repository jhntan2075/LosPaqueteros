package pe.pucp.paqtracker.modelo;

/**
 * Almacen desde el cual parten y al cual retornan las unidades de transporte.
 * El almacen central tiene inventario ilimitado; los almacenes intermedios
 * tienen un stock acotado que se recarga diariamente.
 */
public final class Almacen {

    private final int id;
    private final Nodo ubicacion;
    private final boolean ilimitado;
    private final int stockInicial;

    /**
     * @param id           identificador del almacen
     * @param ubicacion    posicion del almacen en la malla
     * @param ilimitado    verdadero si el inventario es ilimitado (central)
     * @param stockInicial stock disponible al inicio del dia (intermedios)
     */
    public Almacen(int id, Nodo ubicacion, boolean ilimitado, int stockInicial) {
        this.id = id;
        this.ubicacion = ubicacion;
        this.ilimitado = ilimitado;
        this.stockInicial = stockInicial;
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

    public int getStockInicial() {
        return stockInicial;
    }

    @Override
    public String toString() {
        return "A" + id;
    }
}
