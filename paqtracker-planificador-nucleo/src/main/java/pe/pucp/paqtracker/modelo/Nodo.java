package pe.pucp.paqtracker.modelo;

/**
 * Punto de la malla ortogonal de la ciudad. Las unidades se desplazan solo en
 * sentido horizontal o vertical entre nodos adyacentes; no existen diagonales,
 * por lo que la distancia base entre dos nodos es la distancia de Manhattan.
 */
public final class Nodo {

    private final int x;
    private final int y;

    /**
     * Crea un nodo de la malla.
     *
     * @param x coordenada horizontal
     * @param y coordenada vertical
     */
    public Nodo(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    /**
     * Calcula la distancia de Manhattan hacia otro nodo, sin considerar
     * bloqueos.
     *
     * @param otro nodo de destino
     * @return distancia de Manhattan entre este nodo y el otro
     */
    public int distanciaManhattan(Nodo otro) {
        return Math.abs(x - otro.x) + Math.abs(y - otro.y);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Nodo)) {
            return false;
        }
        Nodo nodo = (Nodo) o;
        return x == nodo.x && y == nodo.y;
    }

    @Override
    public int hashCode() {
        return 31 * x + y;
    }

    @Override
    public String toString() {
        return "(" + x + "," + y + ")";
    }
}
