package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Instant;
import java.util.List;

/**
 * Puerto de salida hacia los pedidos registrados en vivo (lo implementa el modulo de pedidos). La
 * operacion dia a dia lo usa al arrancar para no repetir identificadores y para recuperar los pedidos
 * aun vigentes si la API se reinicio.
 */
public interface PuertoPedidosEnVivo {

    /**
     * @param ejecucionId ejecucion
     * @return pedidos registrados en vivo en esa ejecucion, en orden de registro
     */
    List<PedidoEnVivo> listar(String ejecucionId);

    /**
     * Pedido registrado en vivo, tal como quedo guardado.
     *
     * @param idEnEjecucion identificador dentro de la ejecucion
     * @param x             coordenada horizontal del destino
     * @param y             coordenada vertical del destino
     * @param cantidad      paquetes
     * @param plazoMinutos  plazo de entrega
     * @param registradoEn  instante de registro
     * @param horaLimite    instante limite de entrega
     */
    record PedidoEnVivo(int idEnEjecucion, int x, int y, int cantidad, int plazoMinutos, Instant registradoEn,
                        Instant horaLimite) {
    }
}
