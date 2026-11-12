package pe.pucp.paqtracker.util;

import java.util.Arrays;

/**
 * Tabla de distancias ya calculadas por una {@link Malla}. La distancia que recorre una unidad en un
 * tramo depende solo del nodo de origen, el de destino, el minuto de salida, la velocidad de la unidad
 * y su grupo de refrigerio, y el planificador repite la misma consulta miles de veces por ciclo al
 * evaluar rutas que comparten tramos. Guardar el resultado evita recalcularlo sin cambiar su valor.
 *
 * Es una tabla de mapeo directo de tamano fijo: dos consultas distintas que caen en la misma posicion
 * se pisan, y la pisada se recalcula la proxima vez. Asi la memoria queda acotada sin llevar la cuenta
 * de que entradas son las mas antiguas. La tabla se reserva en la primera escritura, para que una
 * malla sin bloqueos no la pague.
 *
 * No es segura entre hilos: cada malla pertenece a una sola ejecucion, que corre en un unico hilo.
 */
final class MemoDistancias {

    /** Clave de una consulta que no se puede guardar. */
    static final long SIN_CLAVE = -1L;

    /** Resultado de buscar una consulta que no esta guardada. */
    static final int SIN_VALOR = -1;

    /** La tabla tiene 2^18 posiciones: unos 3 MB por malla con bloqueos. */
    private static final int BITS_TABLA = 18;

    /** Multiplicador de Fibonacci, que reparte las claves de forma pareja en la tabla. */
    private static final long MULTIPLICADOR_DISPERSION = 0x9E3779B97F4A7C15L;

    private static final int BITS_NODO = 12;
    private static final int BITS_SALIDA = 24;
    private static final int BITS_VELOCIDAD = 8;
    private static final int BITS_GRUPO = 2;

    private long[] claves;
    private int[] valores;

    /**
     * Compone la clave de una consulta. Devuelve {@link #SIN_CLAVE} si algun dato no cabe en los bits
     * reservados; en ese caso la consulta se calcula siempre.
     *
     * @param indiceOrigen  indice lineal del nodo de origen
     * @param indiceDestino indice lineal del nodo de destino
     * @param salida        minuto absoluto de salida
     * @param velocidad     velocidad de la unidad, en km/h
     * @param grupo         grupo de refrigerio de la unidad
     * @return clave de la consulta, o SIN_CLAVE si no se puede guardar
     */
    static long clave(int indiceOrigen, int indiceDestino, int salida, int velocidad, int grupo) {
        if (!cabe(indiceOrigen, BITS_NODO) || !cabe(indiceDestino, BITS_NODO) || !cabe(salida, BITS_SALIDA)
                || !cabe(velocidad, BITS_VELOCIDAD) || !cabe(grupo, BITS_GRUPO)) {
            return SIN_CLAVE;
        }
        long clave = indiceOrigen;
        clave = (clave << BITS_NODO) | indiceDestino;
        clave = (clave << BITS_SALIDA) | salida;
        clave = (clave << BITS_VELOCIDAD) | velocidad;
        return (clave << BITS_GRUPO) | grupo;
    }

    /**
     * @param clave clave de la consulta
     * @return distancia guardada, o SIN_VALOR si la consulta no esta en la tabla
     */
    int buscar(long clave) {
        if (clave == SIN_CLAVE || claves == null) {
            return SIN_VALOR;
        }
        int posicion = posicionDe(clave);
        return claves[posicion] == clave ? valores[posicion] : SIN_VALOR;
    }

    /**
     * Guarda el resultado de una consulta, pisando lo que hubiera en su posicion.
     *
     * @param clave     clave de la consulta
     * @param distancia distancia calculada
     */
    void guardar(long clave, int distancia) {
        if (clave == SIN_CLAVE) {
            return;
        }
        if (claves == null) {
            claves = new long[1 << BITS_TABLA];
            valores = new int[1 << BITS_TABLA];
            Arrays.fill(claves, SIN_CLAVE);
        }
        int posicion = posicionDe(clave);
        claves[posicion] = clave;
        valores[posicion] = distancia;
    }

    private static int posicionDe(long clave) {
        return (int) ((clave * MULTIPLICADOR_DISPERSION) >>> (Long.SIZE - BITS_TABLA));
    }

    private static boolean cabe(int valor, int bits) {
        return valor >= 0 && valor < (1 << bits);
    }
}
