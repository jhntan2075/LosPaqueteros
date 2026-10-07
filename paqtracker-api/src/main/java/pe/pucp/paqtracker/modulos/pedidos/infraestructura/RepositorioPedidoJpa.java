package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import org.springframework.stereotype.Repository;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Adaptador JPA del puerto {@link RepositorioPedido}. Las entidades no salen de esta capa.
 */
@Repository
public class RepositorioPedidoJpa implements RepositorioPedido {

    private final RepositorioPedidoSpringData springData;

    /**
     * @param springData repositorio Spring Data
     */
    public RepositorioPedidoJpa(RepositorioPedidoSpringData springData) {
        this.springData = springData;
    }

    @Override
    public PedidoRegistrado guardar(PedidoRegistrado pedido) {
        EntidadPedido guardada = springData.save(new EntidadPedido(pedido.ejecucionId(), pedido.idEnEjecucion(),
                pedido.cliente(), pedido.x(), pedido.y(), pedido.cantidad(), pedido.plazoHoras(),
                LocalDateTime.ofInstant(pedido.registradoEn(), ZoneOffset.UTC),
                LocalDateTime.ofInstant(pedido.horaLimite(), ZoneOffset.UTC)));
        return aDominio(guardada);
    }

    @Override
    public List<PedidoRegistrado> listarPorEjecucion(String ejecucionId) {
        return springData.findByEjecucionIdOrderByIdEnEjecucion(ejecucionId).stream()
                .map(RepositorioPedidoJpa::aDominio).toList();
    }

    private static PedidoRegistrado aDominio(EntidadPedido entidad) {
        return new PedidoRegistrado(entidad.getId(), entidad.getEjecucionId(), entidad.getIdEnEjecucion(),
                entidad.getCliente(), entidad.getDestinoX(), entidad.getDestinoY(), entidad.getCantidad(),
                entidad.getPlazoHoras(), entidad.getRegistradoEn().toInstant(ZoneOffset.UTC),
                entidad.getHoraLimite().toInstant(ZoneOffset.UTC));
    }
}
