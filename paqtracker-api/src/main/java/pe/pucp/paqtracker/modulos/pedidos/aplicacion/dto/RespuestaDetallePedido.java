package pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto;

import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.HitoPedido;
import java.util.List;

/**
 * Pedido seleccionado con su trazabilidad (LE-077).
 *
 * @param ejecucionId ejecucion a la que pertenece
 * @param pedido      pedido con su estado actual
 * @param hitos       hitos en orden cronologico
 */
public record RespuestaDetallePedido(String ejecucionId, RespuestaPedido pedido, List<HitoPedido> hitos) {
}
