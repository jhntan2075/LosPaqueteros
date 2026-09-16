package pe.pucp.paqtracker.iaco.modelo;

import java.util.ArrayList;
import java.util.List;

/**
 * Plan completo de un ciclo de replanificación: las rutas propuestas y los
 * pedidos que quedan diferidos al siguiente ciclo.
 *
 * <p>{@code aptitud} es el valor agregado de la función objetivo y
 * {@code incumplimientos} el número de entregas fuera de plazo; la IACO v3.0 usa
 * los dos para comparar soluciones de forma lexicográfica.</p>
 */
public final class SolucionRuteo {

    private final List<Ruta> rutas;
    private final List<Pedido> diferidos;
    private double aptitud = Double.POSITIVE_INFINITY;
    private int incumplimientos = Integer.MAX_VALUE;
    private double atrasoTotal = Double.POSITIVE_INFINITY;

    public SolucionRuteo(List<Ruta> rutas, List<Pedido> diferidos) {
        this.rutas = new ArrayList<>(rutas);
        this.diferidos = new ArrayList<>(diferidos);
    }

    public List<Ruta> rutas() { return rutas; }

    public List<Pedido> diferidos() { return diferidos; }

    public double aptitud() { return aptitud; }

    public int incumplimientos() { return incumplimientos; }

    public double atrasoTotal() { return atrasoTotal; }

    public void fijarAptitud(double aptitud, int incumplimientos, double atrasoTotal) {
        this.aptitud = aptitud;
        this.incumplimientos = incumplimientos;
        this.atrasoTotal = atrasoTotal;
    }

    public double km() {
        double km = 0;
        for (Ruta r : rutas) {
            km += r.km();
        }
        return km;
    }

    public double costo() {
        double c = 0;
        for (Ruta r : rutas) {
            c += r.costo();
        }
        return c;
    }

    /** Descarta las rutas que quedaron sin paradas tras la reparación. */
    public void depurar() {
        rutas.removeIf(Ruta::vacia);
    }

    public SolucionRuteo copia() {
        List<Ruta> copias = new ArrayList<>(rutas.size());
        for (Ruta r : rutas) {
            copias.add(r.copia());
        }
        SolucionRuteo s = new SolucionRuteo(copias, diferidos);
        s.fijarAptitud(aptitud, incumplimientos, atrasoTotal);
        return s;
    }

    /**
     * Orden lexicográfico: primero menos incumplimientos, luego menos atraso
     * acumulado y por último menor aptitud (costo + penalizaciones blandas).
     */
    public static int comparaLexicografico(SolucionRuteo a, SolucionRuteo b) {
        if (a.incumplimientos != b.incumplimientos) {
            return Integer.compare(a.incumplimientos, b.incumplimientos);
        }
        if (Math.abs(a.atrasoTotal - b.atrasoTotal) > 1e-9) {
            return Double.compare(a.atrasoTotal, b.atrasoTotal);
        }
        return Double.compare(a.aptitud, b.aptitud);
    }

    @Override
    public String toString() {
        return "SolucionRuteo{rutas=" + rutas.size() + ", diferidos=" + diferidos.size()
                + ", f=" + String.format("%.1f", aptitud) + ", incump=" + incumplimientos + '}';
    }
}
