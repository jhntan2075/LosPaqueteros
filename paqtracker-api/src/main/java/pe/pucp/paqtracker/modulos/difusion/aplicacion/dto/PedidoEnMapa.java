package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import java.util.List;

/**
 * Pedido de una ejecucion con su estado y su nivel de holgura para el semaforo.
 *
 * @param id           identificador del pedido en la ejecucion
 * @param codigo       codigo visible
 * @param destino      punto de entrega
 * @param cantidad     paquetes
 * @param registroMs   registro, epoch en milisegundos simulados
 * @param horaLimiteMs hora limite, epoch en milisegundos simulados
 * @param etaMs        llegada estimada si ya salio, o null
 * @param estado       REGISTRADO, EN_TRANSITO o ENTREGADO
 * @param nivelHolgura VERDE, AMBAR, ROJO o CERRADO (ya entregado)
 * @param unidad       codigo de la unidad que lo lleva, o null
 * @param cliente      identificador del cliente segun el archivo de ventas, o null
 * @param entregaMs    entrega real (la de su ultima fraccion), o null si aun no se entrega
 * @param fracciones   partes del pedido por unidad, en el orden en que salieron
 */
public record PedidoEnMapa(int id, String codigo, Coordenada destino, int cantidad, long registroMs,
                           long horaLimiteMs, Long etaMs, String estado, String nivelHolgura, String unidad,
                           String cliente, Long entregaMs, List<FraccionEnvio> fracciones) {
}
