package pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto;

import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.FraccionEnvio;
import java.util.List;

/**
 * Pedido con su estado en la ejecucion.
 *
 * @param codigo       codigo visible
 * @param cliente      cliente registrado o el del archivo de ventas, o null si no se conoce
 * @param destino      punto de entrega
 * @param cantidad     paquetes
 * @param registroMs   registro, epoch en milisegundos simulados
 * @param horaLimiteMs hora limite, epoch en milisegundos simulados
 * @param etaMs        llegada estimada o real, o null si aun no sale
 * @param estado       REGISTRADO, EN_TRANSITO o ENTREGADO
 * @param nivelHolgura VERDE, AMBAR, ROJO o CERRADO
 * @param unidad       codigo de la unidad asignada, o null
 * @param entregaMs    entrega real, o null si aun no se entrega
 * @param fracciones   partes del pedido por unidad (origen, salida, llegada y estado de cada una)
 */
public record RespuestaPedido(String codigo, String cliente, Coordenada destino, int cantidad, long registroMs,
                              long horaLimiteMs, Long etaMs, String estado, String nivelHolgura, String unidad,
                              Long entregaMs, List<FraccionEnvio> fracciones) {
}
