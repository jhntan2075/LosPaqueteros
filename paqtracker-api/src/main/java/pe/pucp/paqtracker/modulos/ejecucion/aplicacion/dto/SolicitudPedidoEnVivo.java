package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

/**
 * Pedido que se registra en vivo en una ejecucion en curso.
 *
 * @param x             coordenada horizontal del destino
 * @param y             coordenada vertical del destino
 * @param cantidad      paquetes
 * @param plazoMinutos  plazo de entrega desde el registro, en minutos
 * @param idPedido      id que ya le dio la base, o null para que el motor le asigne uno propio
 * @param cliente       cliente, o null
 */
public record SolicitudPedidoEnVivo(int x, int y, int cantidad, int plazoMinutos, Integer idPedido,
                                    String cliente) {

    /**
     * Pedido sin id de la base ni cliente.
     *
     * @param x            coordenada horizontal del destino
     * @param y            coordenada vertical del destino
     * @param cantidad     paquetes
     * @param plazoMinutos plazo de entrega desde el registro, en minutos
     */
    public SolicitudPedidoEnVivo(int x, int y, int cantidad, int plazoMinutos) {
        this(x, y, cantidad, plazoMinutos, null, null);
    }
}
