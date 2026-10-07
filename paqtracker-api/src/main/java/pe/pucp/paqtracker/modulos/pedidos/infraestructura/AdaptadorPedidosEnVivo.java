package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidosEnVivo;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.util.List;

/**
 * Implementa el puerto del modulo de ejecucion con los pedidos manuales guardados por este modulo.
 */
@Component
public class AdaptadorPedidosEnVivo implements PuertoPedidosEnVivo {

    private static final int MINUTOS_POR_HORA = 60;

    private final RepositorioPedido repositorio;

    /**
     * @param repositorio persistencia de pedidos manuales
     */
    public AdaptadorPedidosEnVivo(RepositorioPedido repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public List<PedidoEnVivo> listar(String ejecucionId) {
        return repositorio.listarPorEjecucion(ejecucionId).stream()
                .map(pedido -> new PedidoEnVivo(pedido.idEnEjecucion(), pedido.x(), pedido.y(), pedido.cantidad(),
                        pedido.plazoHoras() * MINUTOS_POR_HORA, pedido.registradoEn(), pedido.horaLimite()))
                .toList();
    }
}
