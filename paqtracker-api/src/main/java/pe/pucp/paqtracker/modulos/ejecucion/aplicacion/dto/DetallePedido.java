package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import java.util.List;

/**
 * Pedido seleccionado con su trazabilidad dentro de la ejecucion (LE-077).
 *
 * @param pedido pedido con su estado actual
 * @param hitos  hitos en orden cronologico
 */
public record DetallePedido(PedidoEnMapa pedido, List<HitoPedido> hitos) {
}
