package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ColapsoRegistrado;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import pe.pucp.paqtracker.simulacion.ColapsoLogistico;
import pe.pucp.paqtracker.simulacion.ResultadoSimulacion;
import java.util.Map;

/**
 * Traduce el resultado que acumula el nucleo a las metricas que se guardan de cada ejecucion.
 */
final class MetricasEjecucion {

    private MetricasEjecucion() {
    }

    /**
     * @param resultado resultado acumulado por la simulacion
     * @return metricas para guardar
     */
    static ResultadoEjecucion de(ResultadoSimulacion resultado) {
        Map<String, Integer> uso = resultado.getUsoPorTipo();
        return new ResultadoEjecucion(resultado.getTotalEntregas(), resultado.getTotalIncumplimientos(),
                resultado.getEntregasTarde(), resultado.getDistanciaTotal(), resultado.getCostoTotal(),
                resultado.getProductosEntregados(), resultado.getProductosFueraDePlazo(),
                resultado.getRetrasoTotalMinutos(), resultado.getRetrasoPonderadoPorProductos(),
                resultado.getReplanificaciones(), resultado.getTiempoComputoMaximoMs(),
                resultado.getTiempoComputoTotalMs(), resultado.getEjecucionesMedidas(),
                resultado.getPicoUnidadesEnUso(), uso.getOrDefault(TipoVehiculo.AUTO.name(), 0),
                uso.getOrDefault(TipoVehiculo.MOTOCICLETA.name(), 0),
                uso.getOrDefault(TipoVehiculo.BICICLETA.name(), 0), resultado.getAveriasAtendidas());
    }

    /**
     * @param resultado    resultado acumulado por la simulacion
     * @param lineaTiempo  relacion entre minutos simulados y fechas
     * @param codigosFlota codigos visibles de las unidades
     * @return instante y causa del colapso, o null si no hubo
     */
    static ColapsoRegistrado colapso(ResultadoSimulacion resultado, LineaTiempo lineaTiempo,
                                     CodigosFlota codigosFlota) {
        return resultado.getColapso().map(colapso -> new ColapsoRegistrado(
                lineaTiempo.aFecha(colapso.getInstante()).toInstant(), colapso.getCausa().name(),
                NomenclaturaOperacion.codigoPedido(colapso.getIdPedido()),
                colapso.getVehiculo().map(codigosFlota::codigo).orElse(null),
                lineaTiempo.aFecha(colapso.getHoraLimite()).toInstant(),
                colapso.getCausa() == ColapsoLogistico.Causa.ENTREGA_TARDIA
                        ? lineaTiempo.aFecha(colapso.getLlegadaEstimada()).toInstant() : null))
                .orElse(null);
    }
}
