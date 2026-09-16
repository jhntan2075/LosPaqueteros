package pe.pucp.paqtracker.iaco.servicio;

import pe.pucp.paqtracker.iaco.modelo.Pedido;

import java.util.List;

/**
 * M12 — lista de candidatos de la colonia.
 *
 * <p>En la v2.1 cada paso de cada hormiga ordenaba <i>todo</i> el conjunto pendiente
 * por distancia al último destino, lo que repite el mismo orden miles de veces por
 * ciclo. Aquí ese orden se calcula una sola vez por ciclo: para cada pedido se
 * guardan los demás pedidos ordenados por distancia Manhattan, y la hormiga solo
 * recorre esa lista hasta juntar K candidatos elegibles.</p>
 */
public final class ListaCandidatos {

    /** Filtro de elegibilidad que aplica la hormiga sobre un candidato. */
    public interface Elegible {
        boolean test(Pedido p);
    }

    private final List<Pedido> pedidos;
    private final int[][] vecinos;   // índices locales ordenados por distancia
    private final int[] posicionDeId;
    private final int maxId;

    public ListaCandidatos(List<Pedido> pedidos) {
        this.pedidos = pedidos;
        int n = pedidos.size();
        int mayor = 0;
        for (Pedido p : pedidos) {
            mayor = Math.max(mayor, p.id());
        }
        this.maxId = mayor;
        this.posicionDeId = new int[mayor + 1];
        java.util.Arrays.fill(posicionDeId, -1);
        for (int i = 0; i < n; i++) {
            posicionDeId[pedidos.get(i).id()] = i;
        }

        this.vecinos = new int[n][];
        int[] orden = new int[n];
        int[] dist = new int[n];
        for (int i = 0; i < n; i++) {
            Pedido pi = pedidos.get(i);
            int m = 0;
            for (int j = 0; j < n; j++) {
                if (j == i) {
                    continue;
                }
                orden[m] = j;
                dist[m] = pi.destino().manhattan(pedidos.get(j).destino());
                m++;
            }
            vecinos[i] = ordenarPorDistancia(orden, dist, m);
        }
    }

    private static int[] ordenarPorDistancia(int[] indices, int[] dist, int m) {
        Integer[] caja = new Integer[m];
        for (int i = 0; i < m; i++) {
            caja[i] = i;
        }
        java.util.Arrays.sort(caja, (a, b) -> Integer.compare(dist[a], dist[b]));
        int[] out = new int[m];
        for (int i = 0; i < m; i++) {
            out[i] = indices[caja[i]];
        }
        return out;
    }

    /**
     * Los K pedidos elegibles más cercanos al destino de {@code desde}.
     *
     * @return número de candidatos escritos en {@code salida}
     */
    public int cercanosA(Pedido desde, int k, Elegible filtro, Pedido[] salida) {
        int pos = desde.id() <= maxId ? posicionDeId[desde.id()] : -1;
        if (pos < 0) {
            return 0;
        }
        int n = 0;
        for (int idx : vecinos[pos]) {
            Pedido p = pedidos.get(idx);
            if (filtro.test(p)) {
                salida[n++] = p;
                if (n == k) {
                    break;
                }
            }
        }
        return n;
    }

    public List<Pedido> pedidos() {
        return pedidos;
    }
}
