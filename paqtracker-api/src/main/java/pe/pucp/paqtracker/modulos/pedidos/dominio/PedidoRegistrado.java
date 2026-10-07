package pe.pucp.paqtracker.modulos.pedidos.dominio;

import java.time.Instant;

/**
 * Pedido registrado manualmente por un operador (CU-01). Es un concepto exclusivo de la API: guarda
 * quien es el cliente y en que ejecucion entro; el nucleo solo conoce destino, cantidad y plazo.
 *
 * @param id            identificador en la base de datos, o null si aun no se guarda
 * @param ejecucionId   ejecucion en la que entro
 * @param idEnEjecucion identificador del pedido dentro de la ejecucion
 * @param cliente       cliente que lo solicita
 * @param x             coordenada horizontal del destino
 * @param y             coordenada vertical del destino
 * @param cantidad      paquetes
 * @param plazoHoras    plazo de entrega
 * @param registradoEn  instante simulado de registro
 * @param horaLimite    instante simulado limite de entrega
 */
public record PedidoRegistrado(Long id, String ejecucionId, int idEnEjecucion, String cliente, int x, int y,
                               int cantidad, int plazoHoras, Instant registradoEn, Instant horaLimite) {
}
