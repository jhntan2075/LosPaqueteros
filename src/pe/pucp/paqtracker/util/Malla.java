package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Malla ortogonal de la ciudad. Calcula la distancia entre dos nodos teniendo
 * en cuenta los bloqueos vigentes en un instante dado. Sin bloqueos que corten
 * el paso, la distancia es la de Manhattan; cuando un bloqueo interrumpe el
 * camino directo, se calcula el camino mas corto real mediante una busqueda en
 * amplitud sobre los nodos transitables.
 */
public final class Malla {

    private static final int SIN_CAMINO = Integer.MAX_VALUE / 4;

    private final List<Bloqueo> bloqueos;

    /**
     * @param bloqueos lista de bloqueos programados que afectan la malla
     */
    public Malla(List<Bloqueo> bloqueos) {
        this.bloqueos = bloqueos;
    }

    /**
     * Construye una malla sin bloqueos.
     */
    public Malla() {
        this.bloqueos = new ArrayList<>();
    }

    /**
     * Codifica un par de coordenadas en una clave larga unica.
     *
     * @param x coordenada horizontal
     * @param y coordenada vertical
     * @return clave que identifica al nodo
     */
    public static long codificar(int x, int y) {
        return ((long) x << 20) | y;
    }

    /**
     * Construye el conjunto de nodos que componen un tramo horizontal o
     * vertical entre dos puntos.
     *
     * @param x1 coordenada x del primer punto
     * @param y1 coordenada y del primer punto
     * @param x2 coordenada x del segundo punto
     * @param y2 coordenada y del segundo punto
     * @return conjunto de nodos del tramo, codificados
     */
    public static Set<Long> nodosDeTramo(int x1, int y1, int x2, int y2) {
        Set<Long> nodos = new HashSet<>();
        if (x1 == x2) {
            for (int y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                nodos.add(codificar(x1, y));
            }
        } else if (y1 == y2) {
            for (int x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
                nodos.add(codificar(x, y1));
            }
        }
        return nodos;
    }

    /**
     * Distancia entre dos nodos considerando los bloqueos vigentes en el
     * instante dado.
     *
     * @param origen   nodo de partida
     * @param destino  nodo de llegada
     * @param instante minuto absoluto en que se recorre el tramo
     * @return distancia real, esquivando bloqueos si es necesario
     */
    public int distancia(Nodo origen, Nodo destino, int instante) {
        Set<Long> bloqueados = nodosBloqueadosEn(instante);
        if (bloqueados.isEmpty()) {
            return origen.distanciaManhattan(destino);
        }
        if (!caminoDirectoBloqueado(origen, destino, bloqueados)) {
            return origen.distanciaManhattan(destino);
        }
        return buscarCaminoMasCorto(origen, destino, bloqueados);
    }

    /**
     * Distancia de Manhattan sin considerar bloqueos.
     *
     * @param origen  nodo de partida
     * @param destino nodo de llegada
     * @return distancia de Manhattan
     */
    public int distancia(Nodo origen, Nodo destino) {
        return origen.distanciaManhattan(destino);
    }

    /**
     * Union de los nodos bloqueados por los bloqueos vigentes en el instante.
     *
     * @param instante minuto absoluto a consultar
     * @return conjunto de nodos intransitables en ese instante
     */
    private Set<Long> nodosBloqueadosEn(int instante) {
        Set<Long> bloqueados = new HashSet<>();
        for (Bloqueo bloqueo : bloqueos) {
            if (bloqueo.estaVigente(instante)) {
                bloqueados.addAll(bloqueo.getNodosBloqueados());
            }
        }
        return bloqueados;
    }

    /**
     * Indica si el rectangulo de movimiento entre origen y destino toca algun
     * nodo bloqueado.
     *
     * @param origen     nodo de partida
     * @param destino    nodo de llegada
     * @param bloqueados nodos intransitables
     * @return verdadero si el camino directo cruza un nodo bloqueado
     */
    private boolean caminoDirectoBloqueado(Nodo origen, Nodo destino, Set<Long> bloqueados) {
        int minX = Math.min(origen.getX(), destino.getX());
        int maxX = Math.max(origen.getX(), destino.getX());
        int minY = Math.min(origen.getY(), destino.getY());
        int maxY = Math.max(origen.getY(), destino.getY());
        for (int x = minX; x <= maxX; x++) {
            for (int y = minY; y <= maxY; y++) {
                if (bloqueados.contains(codificar(x, y))) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Busqueda en amplitud del camino mas corto sobre los nodos transitables.
     * Si el destino esta bloqueado, la unidad se aproxima al vecino transitable
     * mas cercano y se suma el ultimo paso, de modo que el costo sea finito.
     *
     * @param origen     nodo de partida
     * @param destino    nodo de llegada
     * @param bloqueados nodos intransitables
     * @return numero de pasos del camino mas corto
     */
    private int buscarCaminoMasCorto(Nodo origen, Nodo destino, Set<Long> bloqueados) {
        if (origen.getX() == destino.getX() && origen.getY() == destino.getY()) {
            return 0;
        }
        boolean destinoBloqueado = bloqueados.contains(codificar(destino.getX(), destino.getY()));
        boolean[][] visto = new boolean[ConfiguracionDominio.MALLA_ANCHO + 1][ConfiguracionDominio.MALLA_ALTO + 1];
        ArrayDeque<int[]> cola = new ArrayDeque<>();
        cola.add(new int[]{origen.getX(), origen.getY(), 0});
        visto[origen.getX()][origen.getY()] = true;
        int[][] direcciones = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        while (!cola.isEmpty()) {
            int[] actual = cola.poll();
            if (destinoBloqueado && esAdyacente(actual[0], actual[1], destino)) {
                return actual[2] + 1;
            }
            for (int[] direccion : direcciones) {
                int nuevoX = actual[0] + direccion[0];
                int nuevoY = actual[1] + direccion[1];
                if (fueraDeMalla(nuevoX, nuevoY) || visto[nuevoX][nuevoY]) {
                    continue;
                }
                if (bloqueados.contains(codificar(nuevoX, nuevoY))) {
                    continue;
                }
                if (nuevoX == destino.getX() && nuevoY == destino.getY()) {
                    return actual[2] + 1;
                }
                visto[nuevoX][nuevoY] = true;
                cola.add(new int[]{nuevoX, nuevoY, actual[2] + 1});
            }
        }
        return SIN_CAMINO;
    }

    /**
     * @param x coordenada horizontal
     * @param y coordenada vertical
     * @return verdadero si el nodo cae fuera de los limites de la malla
     */
    private boolean fueraDeMalla(int x, int y) {
        return x < 0 || x > ConfiguracionDominio.MALLA_ANCHO
                || y < 0 || y > ConfiguracionDominio.MALLA_ALTO;
    }

    /**
     * @param x       coordenada horizontal del nodo evaluado
     * @param y       coordenada vertical del nodo evaluado
     * @param destino nodo de destino
     * @return verdadero si el nodo evaluado es adyacente al destino
     */
    private boolean esAdyacente(int x, int y, Nodo destino) {
        return Math.abs(x - destino.getX()) + Math.abs(y - destino.getY()) == 1;
    }
}
