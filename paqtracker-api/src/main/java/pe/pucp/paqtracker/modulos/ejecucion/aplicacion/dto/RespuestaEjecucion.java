package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.IndicadoresOperacion;
import java.time.LocalDate;

/**
 * Resumen de una ejecucion para listarla y controlarla.
 *
 * @param id            identificador; el topico STOMP es /topic/ejecuciones/{id}/estado
 * @param nombre        nombre visible
 * @param tipoEscenario DIA_A_DIA, SIMULACION_PERIODO o COLAPSO_LOGISTICO
 * @param estado        estado actual
 * @param algoritmo     GA o IACO
 * @param fechaInicio   primer dia del horizonte
 * @param dias          dias del horizonte
 * @param relojSimulado reloj simulado legible
 * @param relojReal     reloj real legible
 * @param parametros    parametros con los que corre
 * @param indicadores   KPI de la ultima instantanea, o null si aun no corre
 */
public record RespuestaEjecucion(String id, String nombre, String tipoEscenario, String estado, String algoritmo,
                                 LocalDate fechaInicio, int dias, String relojSimulado, String relojReal,
                                 ParametrosEjecucion parametros, IndicadoresOperacion indicadores) {
}
