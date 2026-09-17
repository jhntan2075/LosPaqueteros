package pe.pucp.paqtracker.bancopruebasiaco.modelo;

/**
 * Punto de la rejilla vial. La ciudad es una malla de {@code 70 x 50} tramos de 1 km,
 * por lo que la distancia entre dos nodos es Manhattan y cada arista mide 1 km.
 */
public record Nodo(int x, int y) {

    public int manhattan(Nodo otro) {
        return Math.abs(x - otro.x) + Math.abs(y - otro.y);
    }

    /** Codificación densa del nodo para usar arreglos en lugar de tablas hash. */
    public int codigo(int altoRejilla) {
        return x * (altoRejilla + 1) + y;
    }

    public static Nodo desdeCodigo(int codigo, int altoRejilla) {
        return new Nodo(codigo / (altoRejilla + 1), codigo % (altoRejilla + 1));
    }

    @Override
    public String toString() {
        return "(" + x + "," + y + ")";
    }
}
