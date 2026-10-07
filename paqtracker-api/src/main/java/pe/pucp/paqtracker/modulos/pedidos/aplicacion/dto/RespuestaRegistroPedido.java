package pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto;

/**
 * Resultado de registrar un pedido manualmente: el pedido y el efecto de la replanificacion inmediata.
 *
 * @param ejecucionId         ejecucion en la que quedo registrado
 * @param pedido              pedido con su estado
 * @param replanifico         verdadero si se ejecuto una planificacion al registrarlo
 * @param tiempoComputoMs     Ta de esa planificacion, o -1 si no hubo
 * @param unidadesDespachadas unidades que salieron en esa planificacion
 */
public record RespuestaRegistroPedido(String ejecucionId, RespuestaPedido pedido, boolean replanifico,
                                      long tiempoComputoMs, int unidadesDespachadas) {
}
