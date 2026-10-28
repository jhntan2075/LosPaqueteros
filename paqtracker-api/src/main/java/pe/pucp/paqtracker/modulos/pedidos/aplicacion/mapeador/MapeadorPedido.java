package pe.pucp.paqtracker.modulos.pedidos.aplicacion.mapeador;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaPedido;

/**
 * Convierte el estado de un pedido en la ejecucion en la respuesta REST.
 */
@Component
public class MapeadorPedido {

    /**
     * @param pedido  pedido con su estado en la ejecucion
     * @param cliente cliente registrado a mano, o null; sin el se usa el del archivo de ventas
     * @return respuesta REST
     */
    public RespuestaPedido aRespuesta(PedidoEnMapa pedido, String cliente) {
        return new RespuestaPedido(pedido.codigo(), cliente != null ? cliente : pedido.cliente(), pedido.destino(), pedido.cantidad(), pedido.registroMs(),
                pedido.horaLimiteMs(), pedido.etaMs(), pedido.estado(), pedido.nivelHolgura(), pedido.unidad());
    }
}
