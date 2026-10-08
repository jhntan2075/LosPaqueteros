package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

/**
 * Entrega que una unidad aun no completa.
 *
 * @param codigoPedido pedido que se entrega
 * @param destino      punto de entrega
 * @param cantidad     paquetes que se entregan
 * @param etaMs        llegada estimada, epoch en milisegundos simulados
 */
public record ParadaPendiente(String codigoPedido, Coordenada destino, int cantidad, long etaMs) {
}
