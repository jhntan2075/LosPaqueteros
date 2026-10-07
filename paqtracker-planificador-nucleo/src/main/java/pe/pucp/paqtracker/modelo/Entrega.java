package pe.pucp.paqtracker.modelo;

/**
 * Unidad ruteable derivada de un pedido. Un pedido cuya cantidad excede la
 * capacidad de la unidad mas grande de la flota se fragmenta en varias entregas
 * que comparten destino, plazo e instante de registro. El planificador opera
 * sobre entregas, no sobre pedidos.
 */
public final class Entrega {

    private final int id;
    private final int idPedido;
    private final Nodo destino;
    private final int cantidad;
    private final int instanteRegistro;
    private final int plazo;

    /**
     * @param id               identificador de la entrega
     * @param idPedido         identificador del pedido de origen
     * @param destino          nodo de entrega
     * @param cantidad         unidades de producto de esta entrega
     * @param instanteRegistro minuto absoluto de registro del pedido
     * @param plazo            plazo comprometido en minutos
     */
    public Entrega(int id, int idPedido, Nodo destino, int cantidad,
                   int instanteRegistro, int plazo) {
        this.id = id;
        this.idPedido = idPedido;
        this.destino = destino;
        this.cantidad = cantidad;
        this.instanteRegistro = instanteRegistro;
        this.plazo = plazo;
    }

    public int getId() {
        return id;
    }

    public int getIdPedido() {
        return idPedido;
    }

    public Nodo getDestino() {
        return destino;
    }

    public int getCantidad() {
        return cantidad;
    }

    public int getInstanteRegistro() {
        return instanteRegistro;
    }

    public int getPlazo() {
        return plazo;
    }

    /**
     * Hora limite absoluta de entrega. Se compara contra el instante de llegada
     * de la unidad, no contra el de salida tras el servicio.
     *
     * @return instante de registro mas el plazo comprometido
     */
    public int getHoraLimite() {
        return instanteRegistro + plazo;
    }

    @Override
    public String toString() {
        return "E" + id;
    }
}
