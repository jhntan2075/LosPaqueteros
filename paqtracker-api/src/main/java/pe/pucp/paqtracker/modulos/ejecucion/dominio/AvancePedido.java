package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Instant;

/**
 * Cambio en el avance de un pedido del dia a dia.
 *
 * @param idPedido          pedido (su id en la base)
 * @param estado            estado nuevo
 * @param cantidadEntregada paquetes entregados en total, contando los de antes de un reinicio
 * @param entregadoEn       entrega de la ultima parte, o null si aun no termina
 * @param retrasoMinutos    minutos tarde de la ultima parte, 0 si llego a tiempo, o null si aun no termina
 */
public record AvancePedido(int idPedido, EstadoAvance estado, int cantidadEntregada, Instant entregadoEn,
                           Integer retrasoMinutos) {
}
