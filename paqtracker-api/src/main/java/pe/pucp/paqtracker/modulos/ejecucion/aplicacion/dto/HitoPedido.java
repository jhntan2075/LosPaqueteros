package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

/**
 * Hito de la trazabilidad de un pedido.
 *
 * @param instanteMs instante simulado del hito, epoch en milisegundos
 * @param titulo     que ocurrio (Registrado, Despachado, Entregado...)
 * @param detalle    texto legible con la unidad, el almacen o la holgura
 */
public record HitoPedido(long instanteMs, String titulo, String detalle) {
}
