package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

/**
 * Tramo que una unidad esta recorriendo. Con el reloj simulado, el front interpola su posicion sin
 * recibir cada movimiento.
 *
 * @param tipo                  VIAJE_A_ENTREGA, SERVICIO o RETORNO
 * @param origen                punto de partida
 * @param destino               punto de llegada
 * @param tiempoSalidaSimulado  salida, epoch en milisegundos simulados
 * @param tiempoLlegadaEstimado llegada estimada, epoch en milisegundos simulados
 * @param codigoPedido          pedido que atiende el tramo, o null
 */
public record TramoEnCurso(String tipo, Coordenada origen, Coordenada destino, long tiempoSalidaSimulado,
                           long tiempoLlegadaEstimado, String codigoPedido) {
}
