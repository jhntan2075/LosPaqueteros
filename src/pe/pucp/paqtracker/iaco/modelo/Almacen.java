package pe.pucp.paqtracker.iaco.modelo;

/**
 * Almacén de la red. El central se considera de stock ilimitado; los intermedios
 * arrancan cada día con {@code stockInicial} paquetes (LE-017/LE-018).
 *
 * <p>La identidad es inmutable: el stock vivo de la corrida lo lleva el simulador,
 * porque cada hormiga necesita trabajar sobre una copia del inventario.</p>
 */
public record Almacen(String codigo, Nodo nodo, boolean central, int stockInicial) {

    public static final int STOCK_ILIMITADO = Integer.MAX_VALUE;

    public Almacen {
        if (stockInicial < 0) {
            throw new IllegalArgumentException("Stock inicial negativo en " + codigo);
        }
    }

    public static Almacen central(String codigo, Nodo nodo) {
        return new Almacen(codigo, nodo, true, STOCK_ILIMITADO);
    }

    public static Almacen intermedio(String codigo, Nodo nodo, int stockInicial) {
        return new Almacen(codigo, nodo, false, stockInicial);
    }

    @Override
    public String toString() {
        return codigo + nodo;
    }
}
