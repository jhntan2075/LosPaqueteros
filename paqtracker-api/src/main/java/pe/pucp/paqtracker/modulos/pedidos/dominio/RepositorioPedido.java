package pe.pucp.paqtracker.modulos.pedidos.dominio;

import java.util.List;

/**
 * Puerto de salida para persistir los pedidos registrados manualmente.
 */
public interface RepositorioPedido {

    /**
     * @param pedido pedido a guardar
     * @return pedido guardado, con su identificador
     */
    PedidoRegistrado guardar(PedidoRegistrado pedido);

    /**
     * @param ejecucionId ejecucion
     * @return pedidos registrados manualmente en esa ejecucion
     */
    List<PedidoRegistrado> listarPorEjecucion(String ejecucionId);
}
