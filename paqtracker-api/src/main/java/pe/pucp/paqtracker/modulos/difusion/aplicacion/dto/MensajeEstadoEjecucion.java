package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import java.util.List;

/**
 * Instantanea del estado de una ejecucion, difundida en {@code /topic/ejecuciones/{id}/estado} en cada
 * salto de consumo Sc y devuelta por {@code GET /api/ejecuciones/{id}/estado} a quien se conecta tarde.
 *
 * @param ejecucionId                  ejecucion a la que pertenece
 * @param tipoEscenario                DIA_A_DIA, SIMULACION_PERIODO o COLAPSO_LOGISTICO
 * @param estado                       estado de la ejecucion
 * @param pasoSc                       numero correlativo de la instantanea
 * @param relojSimuladoMs              reloj simulado, epoch en milisegundos
 * @param relojSimuladoFormateado      reloj simulado legible
 * @param relojSimuladoInicioMs        fecha y hora simulada en la que arranco, epoch en milisegundos
 * @param tiempoSimuladoTranscurridoMs tiempo simulado transcurrido desde el arranque (LE-085)
 * @param relojRealFormateado          reloj real legible
 * @param relojRealInicioMs            fecha y hora real en que se inicio, o null si aun no se inicia
 * @param tiempoRealTranscurridoMs     tiempo real transcurrido desde que se inicio (LE-089)
 * @param factorAceleracion            factor k (1 = tiempo real)
 * @param unidades                     estado de toda la flota
 * @param almacenes                    estado de los almacenes
 * @param pedidos                      pedidos aun no entregados
 * @param bloqueos                     bloqueos vigentes
 * @param indicadores                  KPI y semaforo
 */
public record MensajeEstadoEjecucion(String ejecucionId, String tipoEscenario, String estado, long pasoSc,
                                     long relojSimuladoMs, String relojSimuladoFormateado,
                                     long relojSimuladoInicioMs, long tiempoSimuladoTranscurridoMs,
                                     String relojRealFormateado, Long relojRealInicioMs,
                                     long tiempoRealTranscurridoMs, double factorAceleracion,
                                     List<UnidadEnMapa> unidades, List<AlmacenEnMapa> almacenes,
                                     List<PedidoEnMapa> pedidos, List<BloqueoEnMapa> bloqueos,
                                     IndicadoresOperacion indicadores) {
}
