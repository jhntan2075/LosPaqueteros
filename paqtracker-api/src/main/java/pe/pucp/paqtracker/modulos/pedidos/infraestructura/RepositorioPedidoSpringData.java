package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Acceso Spring Data a la tabla {@code pedido}.
 */
public interface RepositorioPedidoSpringData extends JpaRepository<EntidadPedido, Long> {

    /**
     * @param ejecucionId ejecucion
     * @return pedidos de la ejecucion en orden de registro
     */
    List<EntidadPedido> findByEjecucionIdOrderByIdEnEjecucion(String ejecucionId);
}
