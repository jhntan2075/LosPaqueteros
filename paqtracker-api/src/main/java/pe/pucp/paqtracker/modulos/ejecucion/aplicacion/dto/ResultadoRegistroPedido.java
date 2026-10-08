package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;

/**
 * Resultado de registrar un pedido en vivo y replanificar de inmediato (CU-01 + CU-12).
 *
 * @param ejecucionId          ejecucion en la que quedo registrado
 * @param pedido               pedido con su estado tras la replanificacion
 * @param replanifico          verdadero si el registro disparo una planificacion
 * @param tiempoComputoMs      Ta de esa planificacion, o -1 si no hubo
 * @param unidadesDespachadas  unidades que salieron en esa planificacion
 */
public record ResultadoRegistroPedido(String ejecucionId, PedidoEnMapa pedido, boolean replanifico,
                                      long tiempoComputoMs, int unidadesDespachadas) {
}
