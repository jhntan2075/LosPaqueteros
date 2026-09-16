package pe.pucp.paqtracker.iaco.modelo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Secuencia de entregas que una unidad realiza saliendo de un almacén y
 * regresando a otro antes del cambio de turno.
 *
 * <p>Los campos de cronograma ({@link #km()}, {@link #minutoFin()}, tiempos por
 * parada) los rellena el evaluador; permanecen en la ruta para no reasignar
 * memoria en el bucle caliente de la colonia.</p>
 */
public final class Ruta {

    private final Unidad unidad;
    private final Nodo origen;
    private final List<Pedido> pedidos;
    private final double minutoSalida;

    private Almacen retorno;
    private double km;
    private double minutoFin;
    private double[] minutoLlegada = new double[0];
    private double[] minutoFinParada = new double[0];
    private boolean evaluada;

    public Ruta(Unidad unidad, Nodo origen, List<Pedido> pedidos, double minutoSalida) {
        this.unidad = unidad;
        this.origen = origen;
        this.pedidos = new ArrayList<>(pedidos);
        this.minutoSalida = minutoSalida;
    }

    public Unidad unidad() { return unidad; }

    public Nodo origen() { return origen; }

    /** Lista viva: los operadores de búsqueda local la reordenan en sitio. */
    public List<Pedido> pedidos() { return pedidos; }

    public boolean vacia() { return pedidos.isEmpty(); }

    public int tamano() { return pedidos.size(); }

    public double minutoSalida() { return minutoSalida; }

    public Almacen retorno() { return retorno; }

    public double km() { return km; }

    public double minutoFin() { return minutoFin; }

    public boolean evaluada() { return evaluada; }

    public double costo() { return km * unidad.costoPorKm(); }

    public int carga() {
        int c = 0;
        for (Pedido p : pedidos) {
            c += p.cantidad();
        }
        return c;
    }

    /** Añade una parada validando la capacidad de la unidad (LE-020/021/022). */
    public void agregarPedido(Pedido p) {
        if (carga() + p.cantidad() > unidad.capacidad()) {
            throw new CapacidadExcedidaException(
                    "La unidad " + unidad.codigo() + " no admite el pedido " + p.id(),
                    unidad.capacidad(), carga() + p.cantidad());
        }
        pedidos.add(p);
        evaluada = false;
    }

    public void reemplazarPedidos(List<Pedido> nuevos) {
        pedidos.clear();
        pedidos.addAll(nuevos);
        evaluada = false;
    }

    public void invalidar() { evaluada = false; }

    /**
     * Buffers de cronograma reutilizables. La búsqueda local evalúa la misma ruta
     * miles de veces por ciclo; reutilizar los arreglos evita que cada evaluación
     * genere basura.
     */
    public double[] bufferLlegadas(int n) {
        if (minutoLlegada.length != n) {
            minutoLlegada = new double[n];
        }
        return minutoLlegada;
    }

    public double[] bufferFines(int n) {
        if (minutoFinParada.length != n) {
            minutoFinParada = new double[n];
        }
        return minutoFinParada;
    }

    /** Lo invoca el evaluador tras cronometrar la ruta sobre los buffers. */
    public void fijarCronograma(double km, double minutoFin, Almacen retorno) {
        this.km = km;
        this.minutoFin = minutoFin;
        this.retorno = retorno;
        this.evaluada = true;
    }

    public double minutoFinParada(int indice) { return minutoFinParada[indice]; }

    public double minutoLlegada(int indice) { return minutoLlegada[indice]; }

    /** Momento en que termina la hora de entrega del pedido dentro de esta ruta. */
    public double minutoFinDe(Pedido p) {
        for (int i = 0; i < pedidos.size(); i++) {
            if (pedidos.get(i) == p) {
                return minutoFinParada[i];
            }
        }
        throw new IllegalArgumentException("El pedido " + p.id() + " no pertenece a la ruta");
    }

    public boolean contiene(Pedido p) {
        for (Pedido q : pedidos) {
            if (q == p) {
                return true;
            }
        }
        return false;
    }

    /** Vista de la ruta como entregas cronometradas (reporte y despacho). */
    public List<Entrega> entregas() {
        if (!evaluada) {
            return Collections.emptyList();
        }
        List<Entrega> out = new ArrayList<>(pedidos.size());
        for (int i = 0; i < pedidos.size(); i++) {
            out.add(new Entrega(pedidos.get(i), unidad, minutoLlegada[i], minutoFinParada[i]));
        }
        return out;
    }

    /** Copia con la misma unidad y una secuencia independiente de paradas. */
    public Ruta copia() {
        return new Ruta(unidad, origen, pedidos, minutoSalida);
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder(unidad.codigo()).append(origen).append(" [");
        for (int i = 0; i < pedidos.size(); i++) {
            if (i > 0) {
                sb.append(' ');
            }
            sb.append(pedidos.get(i).id());
        }
        return sb.append("] carga=").append(carga()).append('/').append(unidad.capacidad()).toString();
    }
}
