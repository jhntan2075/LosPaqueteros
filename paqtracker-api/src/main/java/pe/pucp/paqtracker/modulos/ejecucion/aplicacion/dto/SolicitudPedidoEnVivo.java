package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

/**
 * Pedido que se registra en vivo en una ejecucion en curso.
 *
 * @param x             coordenada horizontal del destino
 * @param y             coordenada vertical del destino
 * @param cantidad      paquetes
 * @param plazoMinutos  plazo de entrega desde el registro, en minutos
 */
public record SolicitudPedidoEnVivo(int x, int y, int cantidad, int plazoMinutos) {
}
