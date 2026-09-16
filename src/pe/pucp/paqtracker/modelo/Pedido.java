package pe.pucp.paqtracker.modelo;

/**
 * Pedido tal como lo registra el operador: un destino, una cantidad de producto
 * y un plazo comprometido de entrega que empieza a contar desde el instante de
 * registro.
 */
public final class Pedido {

    private final int id;
    private final Nodo destino;
    private final int cantidad;
    private final int instanteRegistro;
    private final int plazo;

    /**
     * @param id               identificador del pedido
     * @param destino          nodo de entrega
     * @param cantidad         unidades de producto solicitadas
     * @param instanteRegistro minuto absoluto en que ingresa el pedido
     * @param plazo            plazo comprometido en minutos
     */
    public Pedido(int id, Nodo destino, int cantidad, int instanteRegistro, int plazo) {
        this.id = id;
        this.destino = destino;
        this.cantidad = cantidad;
        this.instanteRegistro = instanteRegistro;
        this.plazo = plazo;
    }

    public int getId() {
        return id;
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
     * Hora limite absoluta de entrega.
     *
     * @return instante de registro mas el plazo comprometido
     */
    public int getHoraLimite() {
        return instanteRegistro + plazo;
    }
}
