package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import java.util.List;

/**
 * Tramo que una unidad esta recorriendo. Con el reloj simulado, el front interpola su posicion sobre
 * el camino sin recibir cada movimiento (LE-064).
 *
 * @param tipo                  VIAJE_A_ENTREGA, SERVICIO o RETORNO
 * @param origen                nodo de partida
 * @param destino               nodo de llegada
 * @param tiempoSalidaSimulado  salida, epoch en milisegundos simulados
 * @param tiempoLlegadaEstimado llegada estimada, epoch en milisegundos simulados
 * @param codigoPedido          pedido que atiende el tramo, o null
 * @param camino                vertices del camino real, de origen a destino (rodea bloqueos)
 */
public record TramoEnCurso(String tipo, Coordenada origen, Coordenada destino, long tiempoSalidaSimulado,
                           long tiempoLlegadaEstimado, String codigoPedido, List<Coordenada> camino) {
}
