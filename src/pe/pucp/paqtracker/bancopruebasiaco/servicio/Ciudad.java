package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Almacen;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Bloqueo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Nodo;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Red vial con bloqueos por nodo y vigencia temporal (LE-036, LE-066).
 *
 * <p>Un tramo se resuelve en dos pasos: si ningún nodo bloqueado cae dentro de la
 * caja envolvente origen–destino durante la ventana del viaje, la distancia es
 * Manhattan; si lo hay, se ejecuta un A* dependiente del tiempo en el que la unidad
 * puede esperar en el nodo actual hasta que el siguiente se libere.</p>
 *
 * <p>La clase es segura para uso concurrente: la caché es un {@link ConcurrentHashMap}
 * y cada hilo usa su propio espacio de trabajo de A*.</p>
 */
public final class Ciudad {

    /** Resultado de un tramo: kilómetros recorridos y minuto de llegada. */
    public record Tramo(int km, double minutoLlegada) {}

    private static final int CELDA = 8;   // lado del bucket espacial de nodos bloqueados

    private record ClaveTramo(int origen, int destino, int cubo, int velocidad) {}

    private final ConfiguracionDominio cfg;
    private final int ancho;
    private final int alto;
    private final int nodos;

    /** Para cada nodo con cortes: pares (inicio, fin) consecutivos. {@code null} si está libre. */
    private final int[][] intervalosPorNodo;
    /** Índice espacial: celda -> códigos de nodo bloqueados dentro de ella. */
    private final int[][] nodosPorCelda;
    private final int celdasX;
    private final int celdasY;

    private final Map<ClaveTramo, Tramo> cache = new ConcurrentHashMap<>();
    private final ThreadLocal<Espacio> espacio;

    public Ciudad(ConfiguracionDominio cfg, List<Bloqueo> bloqueos) {
        this.cfg = cfg;
        this.ancho = cfg.anchoRejilla();
        this.alto = cfg.altoRejilla();
        this.nodos = cfg.nodosRejilla();
        this.celdasX = ancho / CELDA + 1;
        this.celdasY = alto / CELDA + 1;

        Map<Integer, List<int[]>> acumulado = new HashMap<>();
        for (Bloqueo b : bloqueos) {
            for (Nodo n : b.nodos()) {
                if (n.x() < 0 || n.x() > ancho || n.y() < 0 || n.y() > alto) {
                    continue;
                }
                acumulado.computeIfAbsent(n.codigo(alto), k -> new ArrayList<>())
                        .add(new int[]{b.minutoInicio(), b.minutoFin()});
            }
        }
        // Los almacenes tienen acceso garantizado: nunca se bloquean.
        for (Almacen a : cfg.almacenes()) {
            acumulado.remove(a.nodo().codigo(alto));
        }

        this.intervalosPorNodo = new int[nodos][];
        List<List<Integer>> celdas = new ArrayList<>(celdasX * celdasY);
        for (int i = 0; i < celdasX * celdasY; i++) {
            celdas.add(new ArrayList<>());
        }
        for (Map.Entry<Integer, List<int[]>> e : acumulado.entrySet()) {
            int codigo = e.getKey();
            List<int[]> ivs = e.getValue();
            int[] plano = new int[ivs.size() * 2];
            for (int i = 0; i < ivs.size(); i++) {
                plano[2 * i] = ivs.get(i)[0];
                plano[2 * i + 1] = ivs.get(i)[1];
            }
            intervalosPorNodo[codigo] = plano;
            Nodo n = Nodo.desdeCodigo(codigo, alto);
            celdas.get(indiceCelda(n.x(), n.y())).add(codigo);
        }
        this.nodosPorCelda = new int[celdas.size()][];
        for (int i = 0; i < celdas.size(); i++) {
            List<Integer> lista = celdas.get(i);
            int[] arr = new int[lista.size()];
            for (int j = 0; j < arr.length; j++) {
                arr[j] = lista.get(j);
            }
            nodosPorCelda[i] = arr;
        }
        this.espacio = ThreadLocal.withInitial(() -> new Espacio(nodos));
    }

    private int indiceCelda(int x, int y) {
        return (x / CELDA) * celdasY + (y / CELDA);
    }

    /** Fin del corte que afecta al nodo en el minuto dado, o {@code -1} si está libre. */
    public int bloqueadoHasta(int codigoNodo, double minuto) {
        int[] ivs = intervalosPorNodo[codigoNodo];
        if (ivs == null) {
            return -1;
        }
        for (int i = 0; i < ivs.length; i += 2) {
            if (ivs[i] <= minuto && minuto <= ivs[i + 1]) {
                return ivs[i + 1];
            }
        }
        return -1;
    }

    public boolean bloqueado(Nodo n, double minuto) {
        return bloqueadoHasta(n.codigo(alto), minuto) >= 0;
    }

    /**
     * Recorrido dependiente del tiempo entre dos nodos.
     *
     * @param velocidad velocidad de la unidad en km/h
     */
    public Tramo tramo(Nodo origen, Nodo destino, double minutoSalida, double velocidad) {
        if (origen.equals(destino)) {
            return new Tramo(0, minutoSalida);
        }
        ClaveTramo clave = new ClaveTramo(origen.codigo(alto), destino.codigo(alto),
                (int) (minutoSalida / 5), (int) velocidad);
        Tramo memo = cache.get(clave);
        if (memo != null) {
            return memo;
        }
        Tramo resultado = calcular(origen, destino, minutoSalida, velocidad);
        cache.put(clave, resultado);
        return resultado;
    }

    private Tramo calcular(Nodo origen, Nodo destino, double t0, double velocidad) {
        double minPorKm = 60.0 / velocidad;
        int manhattan = origen.manhattan(destino);
        double tFinOptimista = t0 + manhattan * minPorKm;
        if (cajaLibre(origen, destino, t0, tFinOptimista)) {
            return new Tramo(manhattan, tFinOptimista);
        }
        return aEstrella(origen, destino, t0, minPorKm);
    }

    /** ¿Ningún nodo bloqueado dentro de la caja envolvente durante la ventana del viaje? */
    private boolean cajaLibre(Nodo o, Nodo d, double desde, double hasta) {
        int x0 = Math.min(o.x(), d.x());
        int x1 = Math.max(o.x(), d.x());
        int y0 = Math.min(o.y(), d.y());
        int y1 = Math.max(o.y(), d.y());
        for (int cx = x0 / CELDA; cx <= x1 / CELDA; cx++) {
            for (int cy = y0 / CELDA; cy <= y1 / CELDA; cy++) {
                for (int codigo : nodosPorCelda[cx * celdasY + cy]) {
                    int x = codigo / (alto + 1);
                    int y = codigo % (alto + 1);
                    if (x < x0 || x > x1 || y < y0 || y > y1) {
                        continue;
                    }
                    int[] ivs = intervalosPorNodo[codigo];
                    for (int i = 0; i < ivs.length; i += 2) {
                        if (ivs[i] <= hasta && ivs[i + 1] >= desde) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    /**
     * A* sobre el tiempo con espera permitida: si el nodo siguiente está bloqueado al
     * llegar, la unidad aguarda en el nodo actual hasta que se libere.
     */
    private Tramo aEstrella(Nodo origen, Nodo destino, double t0, double minPorKm) {
        Espacio esp = espacio.get();
        esp.nuevaBusqueda();
        int cOrigen = origen.codigo(alto);
        int cDestino = destino.codigo(alto);
        esp.fijar(cOrigen, t0);
        esp.cola.add(new Entrada(t0 + origen.manhattan(destino) * minPorKm, t0, 0, cOrigen));

        while (!esp.cola.isEmpty()) {
            Entrada e = esp.cola.poll();
            if (e.nodo == cDestino) {
                return new Tramo(e.pasos, e.minuto);
            }
            if (e.minuto > esp.mejor(e.nodo)) {
                continue;
            }
            int x = e.nodo / (alto + 1);
            int y = e.nodo % (alto + 1);
            for (int k = 0; k < 4; k++) {
                int nx = x + DX[k];
                int ny = y + DY[k];
                if (nx < 0 || nx > ancho || ny < 0 || ny > alto) {
                    continue;
                }
                int vecino = nx * (alto + 1) + ny;
                double llegada = e.minuto + minPorKm;
                int liberaEn = bloqueadoHasta(vecino, llegada);
                while (liberaEn >= 0) {
                    llegada = liberaEn + minPorKm;
                    liberaEn = bloqueadoHasta(vecino, llegada);
                }
                if (llegada < esp.mejor(vecino)) {
                    esp.fijar(vecino, llegada);
                    double h = Math.abs(nx - destino.x()) + Math.abs(ny - destino.y());
                    esp.cola.add(new Entrada(llegada + h * minPorKm, llegada, e.pasos + 1, vecino));
                }
            }
        }
        // Inalcanzable: con espera permitida y almacenes siempre abiertos no debería ocurrir.
        return new Tramo(Integer.MAX_VALUE, Double.POSITIVE_INFINITY);
    }

    private static final int[] DX = {1, -1, 0, 0};
    private static final int[] DY = {0, 0, 1, -1};

    private record Entrada(double prioridad, double minuto, int pasos, int nodo) {}

    /** Espacio de trabajo reutilizable por hilo; el sello evita reinicializar arreglos. */
    private static final class Espacio {
        final double[] mejor;
        final int[] sello;
        int visita;
        final PriorityQueue<Entrada> cola;

        Espacio(int nodos) {
            mejor = new double[nodos];
            sello = new int[nodos];
            Arrays.fill(sello, -1);
            cola = new PriorityQueue<>(256, (a, b) -> {
                int c = Double.compare(a.prioridad, b.prioridad);
                if (c != 0) {
                    return c;
                }
                c = Double.compare(a.minuto, b.minuto);
                if (c != 0) {
                    return c;
                }
                c = Integer.compare(a.pasos, b.pasos);
                return c != 0 ? c : Integer.compare(a.nodo, b.nodo);
            });
        }

        void nuevaBusqueda() {
            visita++;
            cola.clear();
        }

        double mejor(int nodo) {
            return sello[nodo] == visita ? mejor[nodo] : Double.POSITIVE_INFINITY;
        }

        void fijar(int nodo, double valor) {
            sello[nodo] = visita;
            mejor[nodo] = valor;
        }
    }

    public ConfiguracionDominio configuracion() {
        return cfg;
    }

    public int tamanoCache() {
        return cache.size();
    }
}
