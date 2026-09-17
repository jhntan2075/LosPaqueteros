package pe.pucp.paqtracker.bancopruebasiaco.modelo;

/**
 * Una parada de la ruta ya cronometrada: cuándo llega la unidad al cliente y
 * cuándo termina la hora de entrega (LE-025), que es el criterio de cumplimiento.
 */
public record Entrega(Pedido pedido, Unidad unidad, double minutoLlegada, double minutoFin) {

    public double atraso() {
        return Math.max(0.0, minutoFin - pedido.minutoLimite());
    }

    public double holgura() {
        return pedido.minutoLimite() - minutoFin;
    }

    public boolean aTiempo() {
        return minutoFin <= pedido.minutoLimite();
    }

    @Override
    public String toString() {
        return "P" + pedido.id() + "@" + Math.round(minutoFin)
                + (aTiempo() ? "" : " (+" + Math.round(atraso()) + ")");
    }
}
