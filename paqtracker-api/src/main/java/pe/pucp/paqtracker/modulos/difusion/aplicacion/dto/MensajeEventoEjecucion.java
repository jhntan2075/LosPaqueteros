package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import java.util.Map;

/**
 * Evento puntual de una ejecucion, difundido en {@code /topic/ejecuciones/{id}/eventos}.
 *
 * @param id                  identificador unico del evento
 * @param ejecucionId         ejecucion a la que pertenece
 * @param tipo                NUEVO_PEDIDO, PLAN_ACTUALIZADO, PEDIDO_ENTREGADO, ALERTA_COLAPSO o EJECUCION_FINALIZADA
 * @param mensaje             texto legible para la bitacora
 * @param timestampSimuladoMs instante simulado del evento, epoch en milisegundos
 * @param detalle             datos adicionales segun el tipo
 */
public record MensajeEventoEjecucion(String id, String ejecucionId, String tipo, String mensaje,
                                     long timestampSimuladoMs, Map<String, Object> detalle) {
}
