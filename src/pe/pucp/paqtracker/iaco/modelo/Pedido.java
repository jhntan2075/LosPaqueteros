package pe.pucp.paqtracker.iaco.modelo;

/**
 * Pedido registrado en el archivo de ventas.
 *
 * <p>Identidad y datos de origen son inmutables; el resultado de la corrida
 * ({@link #minutoEntrega()}, {@link #unidadAsignada()}, {@link #diferimientos()})
 * lo escribe el simulador.</p>
 */
public final class Pedido {

    private int id;
    private final int minutoRegistro;
    private final Nodo destino;
    private final String cliente;
    private final int cantidad;
    private final int plazoHoras;

    private double minutoEntrega = Double.NaN;
    private String unidadAsignada;
    private int diferimientos;

    public Pedido(int id, int minutoRegistro, Nodo destino, String cliente, int cantidad, int plazoHoras) {
        this.id = id;
        this.minutoRegistro = minutoRegistro;
        this.destino = destino;
        this.cliente = cliente;
        this.cantidad = cantidad;
        this.plazoHoras = plazoHoras;
    }

    public int id() { return id; }

    /** El id definitivo se asigna tras ordenar el archivo por momento de registro. */
    public void asignarId(int id) { this.id = id; }

    public int minutoRegistro() { return minutoRegistro; }

    public Nodo destino() { return destino; }

    public String cliente() { return cliente; }

    public int cantidad() { return cantidad; }

    public int plazoHoras() { return plazoHoras; }

    /** Momento límite de entrega: registro + plazo comprometido (LE-025). */
    public int minutoLimite() { return minutoRegistro + plazoHoras * 60; }

    public double minutoEntrega() { return minutoEntrega; }

    public boolean entregado() { return !Double.isNaN(minutoEntrega); }

    public boolean aTiempo() { return entregado() && minutoEntrega <= minutoLimite(); }

    public double atraso() { return entregado() ? Math.max(0, minutoEntrega - minutoLimite()) : 0; }

    public String unidadAsignada() { return unidadAsignada; }

    public int diferimientos() { return diferimientos; }

    public void registrarEntrega(double minutoEntrega, String unidadAsignada) {
        this.minutoEntrega = minutoEntrega;
        this.unidadAsignada = unidadAsignada;
    }

    public void diferir() { diferimientos++; }

    public void reiniciar() {
        minutoEntrega = Double.NaN;
        unidadAsignada = null;
        diferimientos = 0;
    }

    @Override
    public String toString() {
        return "P" + id + destino + " q=" + cantidad + " lim=" + minutoLimite();
    }
}
