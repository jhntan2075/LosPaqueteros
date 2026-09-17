package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Nodo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Pedido;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Ruta;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.SolucionRuteo;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Operadores de mejora sobre una solución ya construida.
 *
 * <ul>
 *   <li>{@link #intraRuta}: 2-Opt y reinserción dentro de cada ruta (v2.1).</li>
 *   <li>{@link #interRutas}: reubicación e intercambio de paradas <i>entre</i> rutas (M11).
 *       Es la mejora que faltaba en la v2.1, donde una parada mal asignada solo podía
 *       reordenarse dentro de su propia ruta, nunca pasar a la unidad correcta.</li>
 * </ul>
 */
public final class BusquedaLocal {

    private static final double EPS = 1e-9;

    private final FuncionAptitud aptitud;

    public BusquedaLocal(FuncionAptitud aptitud) {
        this.aptitud = aptitud;
    }

    /** 2-Opt + reinserción intra-ruta, tal como en la v2.1. */
    public void intraRuta(SolucionRuteo s, FuncionAptitud.Pesos w) {
        for (Ruta r : s.rutas()) {
            intraRuta(r, w);
        }
    }

    public void intraRuta(Ruta r, FuncionAptitud.Pesos w) {
        List<Pedido> ps = r.pedidos();
        int n = ps.size();
        if (n < 2) {
            return;
        }
        double base = aptitud.costoRuta(r, w);
        boolean mejoro = true;
        while (mejoro) {
            mejoro = false;
            // 2-Opt: invertir un subtramo.
            for (int i = 0; i < n - 1; i++) {
                for (int j = i + 2; j <= n; j++) {
                    invertir(ps, i, j);
                    double c = aptitud.costoRuta(r, w);
                    if (c < base - EPS) {
                        base = c;
                        mejoro = true;
                    } else {
                        invertir(ps, i, j);
                    }
                }
            }
            // Reinserción: mover una parada a su mejor posición dentro de la ruta.
            for (int i = 0; i < n; i++) {
                Pedido p = ps.remove(i);
                int mejorJ = i;
                double mejorC = base;
                for (int j = 0; j < n; j++) {
                    if (j == i) {
                        continue;
                    }
                    ps.add(j, p);
                    double c = aptitud.costoRuta(r, w);
                    ps.remove(j);
                    if (c < mejorC - EPS) {
                        mejorJ = j;
                        mejorC = c;
                    }
                }
                ps.add(mejorJ, p);
                if (mejorC < base - EPS) {
                    base = mejorC;
                    mejoro = true;
                }
            }
        }
        aptitud.costoRuta(r, w);   // deja el cronograma coherente con la secuencia final
    }

    private static void invertir(List<Pedido> ps, int desde, int hasta) {
        for (int a = desde, b = hasta - 1; a < b; a++, b--) {
            Pedido tmp = ps.get(a);
            ps.set(a, ps.get(b));
            ps.set(b, tmp);
        }
    }

    /**
     * M11 — reubicación e intercambio entre rutas.
     *
     * <p>Solo se examinan las {@code vecinas} rutas más próximas por centroide, de
     * modo que el costo se mantiene lineal en el número de rutas y no cuadrático.
     * Respeta capacidad de la unidad y stock del almacén de origen.</p>
     *
     * @return {@code true} si alguna pasada mejoró la solución
     */
    public boolean interRutas(SolucionRuteo s, FuncionAptitud.Pesos w,
                              ContextoPlanificacion ctx, int pasadas, int vecinas) {
        List<Ruta> rutas = new ArrayList<>(s.rutas());
        if (rutas.size() < 2) {
            return false;
        }
        Map<Nodo, Integer> cargaPorOrigen = new HashMap<>();
        for (Ruta r : rutas) {
            cargaPorOrigen.merge(r.origen(), r.carga(), Integer::sum);
        }

        boolean huboMejora = false;
        for (int pasada = 0; pasada < pasadas; pasada++) {
            boolean mejoroPasada = false;
            int[][] vecindario = vecindario(rutas, vecinas);
            for (int a = 0; a < rutas.size(); a++) {
                Ruta ra = rutas.get(a);
                for (int b : vecindario[a]) {
                    if (b == a) {
                        continue;
                    }
                    Ruta rb = rutas.get(b);
                    if (reubicar(ra, rb, w, ctx, cargaPorOrigen)
                            || intercambiar(ra, rb, w, ctx, cargaPorOrigen)) {
                        mejoroPasada = true;
                    }
                }
            }
            huboMejora |= mejoroPasada;
            if (!mejoroPasada) {
                break;
            }
        }
        if (huboMejora) {
            s.depurar();
        }
        return huboMejora;
    }

    /** Mueve una parada de {@code ra} a la mejor posición de {@code rb}. */
    private boolean reubicar(Ruta ra, Ruta rb, FuncionAptitud.Pesos w,
                             ContextoPlanificacion ctx, Map<Nodo, Integer> cargaPorOrigen) {
        boolean mejoro = false;
        int i = 0;
        while (i < ra.tamano()) {
            Pedido p = ra.pedidos().get(i);
            if (rb.carga() + p.cantidad() > rb.unidad().capacidad()
                    || !haySitio(ra, rb, p.cantidad(), ctx, cargaPorOrigen)) {
                i++;
                continue;
            }
            double base = aptitud.costoRuta(ra, w) + aptitud.costoRuta(rb, w);
            ra.pedidos().remove(i);
            double costoA = aptitud.costoRuta(ra, w);

            int mejorJ = -1;
            double mejorTotal = base;
            for (int j = 0; j <= rb.tamano(); j++) {
                rb.pedidos().add(j, p);
                double total = costoA + aptitud.costoRuta(rb, w);
                rb.pedidos().remove(j);
                if (total < mejorTotal - EPS) {
                    mejorTotal = total;
                    mejorJ = j;
                }
            }
            if (mejorJ >= 0) {
                rb.pedidos().add(mejorJ, p);
                aplicarMovimiento(ra, rb, p.cantidad(), cargaPorOrigen);
                mejoro = true;
                // No avanzamos i: la parada siguiente ocupa ahora esta posición.
            } else {
                ra.pedidos().add(i, p);
                i++;
            }
        }
        aptitud.costoRuta(ra, w);
        aptitud.costoRuta(rb, w);
        return mejoro;
    }

    /** Intercambia una parada de {@code ra} por una de {@code rb}. */
    private boolean intercambiar(Ruta ra, Ruta rb, FuncionAptitud.Pesos w,
                                 ContextoPlanificacion ctx, Map<Nodo, Integer> cargaPorOrigen) {
        boolean mejoro = false;
        for (int i = 0; i < ra.tamano(); i++) {
            for (int j = 0; j < rb.tamano(); j++) {
                Pedido pa = ra.pedidos().get(i);
                Pedido pb = rb.pedidos().get(j);
                int delta = pb.cantidad() - pa.cantidad();
                if (ra.carga() + delta > ra.unidad().capacidad()
                        || rb.carga() - delta > rb.unidad().capacidad()) {
                    continue;
                }
                if (delta > 0 && !haySitio(rb, ra, delta, ctx, cargaPorOrigen)) {
                    continue;
                }
                if (delta < 0 && !haySitio(ra, rb, -delta, ctx, cargaPorOrigen)) {
                    continue;
                }
                double base = aptitud.costoRuta(ra, w) + aptitud.costoRuta(rb, w);
                ra.pedidos().set(i, pb);
                rb.pedidos().set(j, pa);
                double nuevo = aptitud.costoRuta(ra, w) + aptitud.costoRuta(rb, w);
                if (nuevo < base - EPS) {
                    if (delta > 0) {
                        aplicarMovimiento(rb, ra, delta, cargaPorOrigen);
                    } else if (delta < 0) {
                        aplicarMovimiento(ra, rb, -delta, cargaPorOrigen);
                    }
                    mejoro = true;
                } else {
                    ra.pedidos().set(i, pa);
                    rb.pedidos().set(j, pb);
                }
            }
        }
        aptitud.costoRuta(ra, w);
        aptitud.costoRuta(rb, w);
        return mejoro;
    }

    /** ¿El almacén receptor tiene stock para absorber la carga que se le traslada? */
    private boolean haySitio(Ruta origen, Ruta destino, int cantidad,
                             ContextoPlanificacion ctx, Map<Nodo, Integer> cargaPorOrigen) {
        if (origen.origen().equals(destino.origen())) {
            return true;   // el inventario no cambia de almacén
        }
        int disponible = ctx.disponible(destino.origen());
        int usado = cargaPorOrigen.getOrDefault(destino.origen(), 0);
        return usado + cantidad <= disponible;
    }

    private void aplicarMovimiento(Ruta origen, Ruta destino, int cantidad,
                                   Map<Nodo, Integer> cargaPorOrigen) {
        if (origen.origen().equals(destino.origen())) {
            return;
        }
        cargaPorOrigen.merge(origen.origen(), -cantidad, Integer::sum);
        cargaPorOrigen.merge(destino.origen(), cantidad, Integer::sum);
    }

    /** Índices de las {@code k} rutas de centroide más cercano a cada ruta. */
    private int[][] vecindario(List<Ruta> rutas, int k) {
        int n = rutas.size();
        double[] cx = new double[n];
        double[] cy = new double[n];
        for (int i = 0; i < n; i++) {
            Ruta r = rutas.get(i);
            if (r.vacia()) {
                cx[i] = r.origen().x();
                cy[i] = r.origen().y();
                continue;
            }
            double sx = 0;
            double sy = 0;
            for (Pedido p : r.pedidos()) {
                sx += p.destino().x();
                sy += p.destino().y();
            }
            cx[i] = sx / r.tamano();
            cy[i] = sy / r.tamano();
        }
        int limite = Math.min(k, n - 1);
        int[][] out = new int[n][];
        Integer[] orden = new Integer[n];
        for (int i = 0; i < n; i++) {
            final int fi = i;
            for (int j = 0; j < n; j++) {
                orden[j] = j;
            }
            java.util.Arrays.sort(orden, (u, v) -> Double.compare(
                    Math.abs(cx[u] - cx[fi]) + Math.abs(cy[u] - cy[fi]),
                    Math.abs(cx[v] - cx[fi]) + Math.abs(cy[v] - cy[fi])));
            int[] vec = new int[limite];
            int puestos = 0;
            for (int j = 0; j < n && puestos < limite; j++) {
                if (orden[j] != i) {
                    vec[puestos++] = orden[j];
                }
            }
            out[i] = java.util.Arrays.copyOf(vec, puestos);
        }
        return out;
    }
}
