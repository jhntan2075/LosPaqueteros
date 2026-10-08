package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.IntUnaryOperator;

/**
 * Malla ortogonal de la ciudad. Calcula la distancia entre dos nodos teniendo
 * en cuenta los bloqueos. Sin bloqueos que corten el paso, la distancia es la
 * de Manhattan; cuando un bloqueo interrumpe el camino directo, se calcula el
 * camino mas corto real mediante una busqueda en amplitud sobre los nodos
 * transitables.
 *
 * Los bloqueos se conocen de antemano, asi que cuando se sabe que unidad
 * recorre el tramo cada nodo se evalua en el minuto en que la unidad llegaria
 * a el: un bloqueo que empieza a mitad del viaje se rodea y uno que termina
 * antes de que la unidad llegue no la desvia.
 *
 * El conjunto de nodos bloqueados solo cambia cuando un bloqueo empieza o
 * termina, de modo que la linea de tiempo se parte en tramos y el conjunto de
 * cada tramo se calcula una sola vez y se reutiliza. Sin esa cache, cada
 * consulta de distancia recorria la lista completa de bloqueos del horizonte:
 * en una corrida de un anio eran 7246 bloqueos recorridos por consulta para
 * descubrir que solo uno estaba vigente, y el planificador hace millones de
 * consultas por ciclo.
 */
public final class Malla {

    private static final int SIN_CAMINO = Integer.MAX_VALUE / 4;

    /** Filas del indice lineal de nodos (x * ALTO_INDICE + y) usado al reconstruir caminos. */
    private static final int ALTO_INDICE = ConfiguracionDominio.MALLA_ALTO + 1;
    private static final int TOTAL_NODOS = (ConfiguracionDominio.MALLA_ANCHO + 1) * ALTO_INDICE;
    private static final int NO_VISITADO = -2;
    private static final int RAIZ = -1;
    private static final int[][] DIRECCIONES = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    private final List<Bloqueo> bloqueos;

    /** Instantes en que el conjunto de bloqueos vigentes cambia, ordenados. */
    private final int[] cambios;

    /** Conjunto de nodos bloqueados de cada tramo, calculado al pedirlo. */
    private final Map<Integer, Set<Long>> cachePorTramo;

    /**
     * @param bloqueos lista de bloqueos programados que afectan la malla
     */
    public Malla(List<Bloqueo> bloqueos) {
        this.bloqueos = bloqueos;
        this.cambios = calcularCambios(bloqueos);
        this.cachePorTramo = new HashMap<>();
    }

    /**
     * Construye una malla sin bloqueos.
     */
    public Malla() {
        this(new ArrayList<>());
    }

    /**
     * Reune los instantes en que algun bloqueo empieza o deja de estar vigente.
     * Entre dos instantes consecutivos de esta lista, el conjunto de nodos
     * bloqueados es constante.
     *
     * @param bloqueos bloqueos programados
     * @return instantes de cambio, ordenados y sin repeticiones
     */
    private static int[] calcularCambios(List<Bloqueo> bloqueos) {
        Set<Integer> instantes = new TreeSet<>();
        for (Bloqueo bloqueo : bloqueos) {
            instantes.add(bloqueo.getInstanteInicio());
            instantes.add(bloqueo.getInstanteFin() + 1);
        }
        int[] cambios = new int[instantes.size()];
        int indice = 0;
        for (int instante : instantes) {
            cambios[indice++] = instante;
        }
        return cambios;
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
     * Distancia entre dos nodos con los bloqueos vigentes en un unico instante, como si todo el
     * tramo se recorriera en ese minuto. Solo sirve para estimaciones que no conocen la unidad
     * (heuristicas); para evaluar o trazar una ruta se usa
     * {@link #distancia(Nodo, Nodo, int, Vehiculo)}.
     *
     * @param origen   nodo de partida
     * @param destino  nodo de llegada
     * @param instante minuto absoluto en que se evaluan los bloqueos
     * @return distancia real, esquivando bloqueos si es necesario
     */
    public int distancia(Nodo origen, Nodo destino, int instante) {
        return distancia(origen, destino, instante, instante, kilometros -> instante);
    }

    /**
     * Distancia que recorre una unidad entre dos nodos saliendo en el instante dado. Cada nodo se
     * evalua contra los bloqueos vigentes en el minuto en que la unidad llegaria a el, con su
     * velocidad y su refrigerio, igual que el reloj de {@link CalculadoraTiempos}.
     *
     * @param origen   nodo de partida
     * @param destino  nodo de llegada
     * @param salida   minuto absoluto en que la unidad sale del origen
     * @param vehiculo unidad que recorre el tramo
     * @return distancia real, esquivando los bloqueos que encontraria en el camino
     */
    public int distancia(Nodo origen, Nodo destino, int salida, Vehiculo vehiculo) {
        IntUnaryOperator llegada = kilometros -> instanteTrasRecorrer(salida, kilometros, vehiculo);
        return distancia(origen, destino, salida, llegada.applyAsInt(origen.distanciaManhattan(destino)),
                llegada);
    }

    /**
     * Camino entre dos nodos con los bloqueos vigentes en un unico instante. Su longitud coincide con
     * {@link #distancia(Nodo, Nodo, int)}.
     *
     * @param origen   nodo de partida
     * @param destino  nodo de llegada
     * @param instante minuto absoluto en que se evaluan los bloqueos
     * @return vertices del camino; un solo nodo si origen y destino coinciden
     */
    public List<Nodo> camino(Nodo origen, Nodo destino, int instante) {
        return camino(origen, destino, instante, instante, kilometros -> instante);
    }

    /**
     * Camino que recorre una unidad entre dos nodos, como lista de vertices (origen, esquinas y
     * destino). Su longitud coincide con {@link #distancia(Nodo, Nodo, int, Vehiculo)}: si ningun
     * bloqueo toca el rectangulo mientras dura el viaje es el camino en L (primero el eje x); si lo
     * toca, el camino mas corto que no pisa un nodo bloqueado en el minuto en que la unidad pasa por
     * el. Se calcula una sola vez por despacho para dibujar la ruta; nunca dentro de los bucles de
     * busqueda.
     *
     * @param origen   nodo de partida
     * @param destino  nodo de llegada
     * @param salida   minuto absoluto en que la unidad sale del origen
     * @param vehiculo unidad que recorre el tramo
     * @return vertices del camino; un solo nodo si origen y destino coinciden
     */
    public List<Nodo> camino(Nodo origen, Nodo destino, int salida, Vehiculo vehiculo) {
        IntUnaryOperator llegada = kilometros -> instanteTrasRecorrer(salida, kilometros, vehiculo);
        return camino(origen, destino, salida, llegada.applyAsInt(origen.distanciaManhattan(destino)),
                llegada);
    }

    /**
     * Camino de Manhattan en L entre dos nodos, sin considerar bloqueos: primero el eje x, luego el y.
     *
     * @param origen  nodo de partida
     * @param destino nodo de llegada
     * @return vertices del camino; un solo nodo si origen y destino coinciden
     */
    public static List<Nodo> caminoEnL(Nodo origen, Nodo destino) {
        List<Nodo> vertices = new ArrayList<>();
        vertices.add(origen);
        Nodo esquina = new Nodo(destino.getX(), origen.getY());
        if (!esquina.equals(origen) && !esquina.equals(destino)) {
            vertices.add(esquina);
        }
        if (!destino.equals(origen)) {
            vertices.add(destino);
        }
        return vertices;
    }

    /**
     * @return bloqueos programados de la malla, de solo lectura
     */
    public List<Bloqueo> getBloqueos() {
        return Collections.unmodifiableList(bloqueos);
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
     * Distancia con el atajo de Manhattan: la busqueda solo corre si algun bloqueo vigente entre la
     * salida y la llegada por el camino en L toca el rectangulo del recorrido.
     *
     * @param desde   minuto de salida
     * @param hasta   minuto de llegada por el camino en L
     * @param llegada minuto en que la unidad alcanza cada kilometro recorrido
     */
    private int distancia(Nodo origen, Nodo destino, int desde, int hasta, IntUnaryOperator llegada) {
        if (origen.equals(destino) || !rectanguloBloqueadoEntre(origen, destino, desde, hasta)) {
            return origen.distanciaManhattan(destino);
        }
        int[] padre = new int[TOTAL_NODOS];
        int[] pasos = new int[TOTAL_NODOS];
        int ultimo = buscarCaminoMasCorto(origen, destino, llegada, padre, pasos);
        return ultimo == NO_VISITADO ? SIN_CAMINO : pasos[ultimo] + 1;
    }

    private List<Nodo> camino(Nodo origen, Nodo destino, int desde, int hasta, IntUnaryOperator llegada) {
        if (origen.equals(destino) || !rectanguloBloqueadoEntre(origen, destino, desde, hasta)) {
            return caminoEnL(origen, destino);
        }
        int[] padre = new int[TOTAL_NODOS];
        int ultimo = buscarCaminoMasCorto(origen, destino, llegada, padre, new int[TOTAL_NODOS]);
        return ultimo == NO_VISITADO ? caminoEnL(origen, destino) : comprimir(armarCamino(padre, ultimo, destino));
    }

    /**
     * Minuto en que una unidad termina de recorrer una cantidad de kilometros, con el mismo calculo
     * que el reloj de las rutas: velocidad del tipo de unidad y pausa del refrigerio.
     */
    private static int instanteTrasRecorrer(int salida, int kilometros, Vehiculo vehiculo) {
        return CalendarioTurnos.avanzarConPausa(vehiculo.getId(), salida,
                CalculadoraTiempos.minutosDeViaje(kilometros, vehiculo.getTipo()));
    }

    /**
     * Indica si algun nodo bloqueado en algun momento del intervalo cae dentro del rectangulo de
     * movimiento. Recorre solo los tramos de tiempo que el intervalo atraviesa.
     *
     * @param desde primer minuto del intervalo
     * @param hasta ultimo minuto del intervalo
     * @return verdadero si el camino directo podria cruzar un bloqueo
     */
    private boolean rectanguloBloqueadoEntre(Nodo origen, Nodo destino, int desde, int hasta) {
        if (cambios.length == 0) {
            return false;
        }
        for (int tramo = tramoDe(desde); tramo <= tramoDe(hasta); tramo++) {
            if (caminoDirectoBloqueado(origen, destino, nodosBloqueadosDelTramo(tramo))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Union de los nodos bloqueados por los bloqueos vigentes en el instante.
     *
     * @param instante minuto absoluto a consultar
     * @return conjunto de nodos intransitables en ese instante
     */
    private Set<Long> nodosBloqueadosEn(int instante) {
        if (cambios.length == 0) {
            return Set.of();
        }
        return nodosBloqueadosDelTramo(tramoDe(instante));
    }

    /**
     * @param tramo indice del tramo de tiempo; -1 es el tramo previo al primer bloqueo
     * @return nodos bloqueados durante ese tramo
     */
    private Set<Long> nodosBloqueadosDelTramo(int tramo) {
        if (tramo < 0) {
            return Set.of();
        }
        return cachePorTramo.computeIfAbsent(tramo, indice -> construirBloqueados(cambios[indice]));
    }

    /**
     * Identifica el tramo de tiempo al que pertenece un instante. Todos los
     * instantes de un mismo tramo comparten el conjunto de nodos bloqueados.
     *
     * @param instante instante a ubicar
     * @return indice del tramo
     */
    private int tramoDe(int instante) {
        int posicion = Arrays.binarySearch(cambios, instante);
        return posicion >= 0 ? posicion : -posicion - 2;
    }

    /**
     * Calcula el conjunto de nodos bloqueados de un instante recorriendo la
     * lista de bloqueos. Se invoca una vez por tramo de tiempo, no por consulta.
     *
     * @param instante instante del tramo
     * @return nodos bloqueados, codificados
     */
    private Set<Long> construirBloqueados(int instante) {
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
        // Se recorre lo mas pequeno: los nodos bloqueados vigentes suelen ser
        // muchos menos que las celdas del rectangulo que encierra al recorrido.
        if (bloqueados.size() < (long) (maxX - minX + 1) * (maxY - minY + 1)) {
            for (long nodo : bloqueados) {
                int x = (int) (nodo >>> 20);
                int y = (int) (nodo & 0xFFFFF);
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    return true;
                }
            }
            return false;
        }
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
     * Busqueda en amplitud del camino mas corto sobre los nodos transitables. Como la cola avanza
     * kilometro a kilometro, todos los vecinos de un nodo se alcanzan en el mismo minuto y se
     * descartan los que esten bloqueados en ese minuto. El destino siempre se acepta: si esta
     * bloqueado, la unidad da el ultimo paso desde el vecino transitable y el costo es finito.
     *
     * @param origen  nodo de partida, distinto del destino
     * @param destino nodo de llegada
     * @param llegada minuto en que la unidad alcanza cada kilometro recorrido
     * @param padre   arreglo de salida: de que nodo se llego a cada uno
     * @param pasos   arreglo de salida: kilometros recorridos hasta cada nodo
     * @return indice del nodo desde el que se da el ultimo paso al destino, o NO_VISITADO si no hay camino
     */
    private int buscarCaminoMasCorto(Nodo origen, Nodo destino, IntUnaryOperator llegada, int[] padre,
                                     int[] pasos) {
        Arrays.fill(padre, NO_VISITADO);
        ArrayDeque<Integer> cola = new ArrayDeque<>();
        padre[indice(origen.getX(), origen.getY())] = RAIZ;
        cola.add(indice(origen.getX(), origen.getY()));
        int pasoEvaluado = -1;
        Set<Long> bloqueados = Set.of();
        while (!cola.isEmpty()) {
            int actual = cola.poll();
            // La cola sale ordenada por kilometros: el conjunto cambia solo al pasar al siguiente.
            if (pasos[actual] + 1 != pasoEvaluado) {
                pasoEvaluado = pasos[actual] + 1;
                bloqueados = nodosBloqueadosEn(llegada.applyAsInt(pasoEvaluado));
            }
            for (int[] direccion : DIRECCIONES) {
                int nuevoX = actual / ALTO_INDICE + direccion[0];
                int nuevoY = actual % ALTO_INDICE + direccion[1];
                if (nuevoX == destino.getX() && nuevoY == destino.getY()) {
                    return actual;
                }
                if (fueraDeMalla(nuevoX, nuevoY) || padre[indice(nuevoX, nuevoY)] != NO_VISITADO
                        || bloqueados.contains(codificar(nuevoX, nuevoY))) {
                    continue;
                }
                padre[indice(nuevoX, nuevoY)] = actual;
                pasos[indice(nuevoX, nuevoY)] = pasoEvaluado;
                cola.add(indice(nuevoX, nuevoY));
            }
        }
        return NO_VISITADO;
    }

    private static List<Nodo> armarCamino(int[] padre, int ultimo, Nodo destino) {
        LinkedList<Nodo> nodos = new LinkedList<>();
        nodos.addFirst(destino);
        for (int actual = ultimo; actual != RAIZ; actual = padre[actual]) {
            nodos.addFirst(new Nodo(actual / ALTO_INDICE, actual % ALTO_INDICE));
        }
        return nodos;
    }

    /**
     * Deja solo los vertices: quita los nodos intermedios de cada segmento recto.
     */
    private static List<Nodo> comprimir(List<Nodo> nodos) {
        List<Nodo> vertices = new ArrayList<>();
        for (int i = 0; i < nodos.size(); i++) {
            boolean extremo = i == 0 || i == nodos.size() - 1;
            if (extremo || !esColineal(nodos.get(i - 1), nodos.get(i), nodos.get(i + 1))) {
                vertices.add(nodos.get(i));
            }
        }
        return vertices;
    }

    private static boolean esColineal(Nodo anterior, Nodo actual, Nodo siguiente) {
        return (anterior.getX() == actual.getX() && actual.getX() == siguiente.getX())
                || (anterior.getY() == actual.getY() && actual.getY() == siguiente.getY());
    }

    private static int indice(int x, int y) {
        return x * ALTO_INDICE + y;
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
}
