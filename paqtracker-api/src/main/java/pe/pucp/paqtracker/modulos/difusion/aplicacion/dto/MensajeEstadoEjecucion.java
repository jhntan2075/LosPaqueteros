package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import java.util.List;

/**
 * Instantanea del estado de una ejecucion, difundida en {@code /topic/ejecuciones/{id}/estado} en cada
 * salto de consumo Sc y devuelta por {@code GET /api/ejecuciones/{id}/estado} a quien se conecta tarde.
 *
 * @param ejecucionId             ejecucion a la que pertenece
 * @param tipoEscenario           DIA_A_DIA, SIMULACION_PERIODO o COLAPSO_LOGISTICO
 * @param estado                  estado de la ejecucion
 * @param pasoSc                  numero correlativo de la instantanea
 * @param relojSimuladoMs         reloj simulado, epoch en milisegundos
 * @param relojSimuladoFormateado reloj simulado legible
 * @param relojRealFormateado     reloj real legible
 * @param factorAceleracion       factor k (1 = tiempo real)
 * @param unidades                estado de toda la flota
 * @param almacenes               estado de los almacenes
 * @param pedidos                 pedidos aun no entregados
 * @param indicadores             KPI y semaforo
 */
public record MensajeEstadoEjecucion(String ejecucionId, String tipoEscenario, String estado, long pasoSc,
                                     long relojSimuladoMs, String relojSimuladoFormateado,
                                     String relojRealFormateado, double factorAceleracion,
                                     List<UnidadEnMapa> unidades, List<AlmacenEnMapa> almacenes,
                                     List<PedidoEnMapa> pedidos, IndicadoresOperacion indicadores) {
}
