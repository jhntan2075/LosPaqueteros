package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Datos de la ejecucion que acompanan a la simulacion al construir una instantanea.
 *
 * @param ejecucionId       ejecucion
 * @param tipoEscenario     tipo de escenario
 * @param estado            estado de la ejecucion
 * @param pasoSc            numero correlativo de la instantanea
 * @param minutoSimulado    minuto simulado actual, con fraccion
 * @param lineaTiempo       relacion entre minutos simulados y fechas
 * @param relojReal         fecha y hora real
 * @param factorAceleracion factor k
 * @param pedidos           pedidos aun no entregados
 * @param indicadores       KPI calculados por el seguimiento de la ejecucion
 */
public record ContextoInstantanea(String ejecucionId, String tipoEscenario, String estado, long pasoSc,
                                  double minutoSimulado, LineaTiempo lineaTiempo, ZonedDateTime relojReal,
                                  double factorAceleracion, List<PedidoEnMapa> pedidos,
                                  IndicadoresOperacion indicadores) {
}
