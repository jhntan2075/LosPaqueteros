package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Instant;

/**
 * Instante y causa del colapso logistico de una ejecucion.
 *
 * @param fecha           instante simulado en que se declaro
 * @param causa           ENTREGA_TARDIA o PLAZO_VENCIDO_SIN_DESPACHO
 * @param pedido          codigo del pedido que lo provoco (P-NNNNN)
 * @param unidad          codigo de la unidad que lo llevaba, o null si no salio
 * @param horaLimite      hora limite del pedido
 * @param llegadaEstimada llegada prevista del pedido, o null si no salio
 */
public record ColapsoRegistrado(Instant fecha, String causa, String pedido, String unidad, Instant horaLimite,
                                Instant llegadaEstimada) {
}
