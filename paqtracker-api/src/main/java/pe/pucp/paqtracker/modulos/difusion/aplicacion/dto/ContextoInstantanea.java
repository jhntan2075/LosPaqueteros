package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Datos de la ejecucion que acompanan a la simulacion al construir una instantanea.
 *
 * @param ejecucionId       ejecucion
 * @param tipoEscenario     tipo de escenario
 * @param estado            estado de la ejecucion
 * @param pasoSc            numero correlativo de la instantanea
 * @param minutoInicial     minuto simulado en el que arranco
 * @param minutoSimulado    minuto simulado actual, con fraccion
 * @param lineaTiempo       relacion entre minutos simulados y fechas
 * @param relojReal         fecha y hora real
 * @param relojRealInicio   instante real en que se inicio, o null si aun no se inicia
 * @param factorAceleracion factor k
 * @param codigosFlota      codigos visibles de las unidades de la ejecucion
 * @param pedidos           pedidos aun no entregados
 * @param indicadores       KPI calculados por el seguimiento de la ejecucion
 */
public record ContextoInstantanea(String ejecucionId, String tipoEscenario, String estado, long pasoSc,
                                  double minutoInicial, double minutoSimulado, LineaTiempo lineaTiempo,
                                  ZonedDateTime relojReal, Instant relojRealInicio, double factorAceleracion,
                                  CodigosFlota codigosFlota, List<PedidoEnMapa> pedidos,
                                  IndicadoresOperacion indicadores) {
}
