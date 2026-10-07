package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.mapeador.MapeadorPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Implementa CU-04 Consultar pedidos: lista los pedidos de una ejecucion con su estado, unidad
 * asignada, llegada estimada y nivel de holgura, y el cliente de los registrados manualmente.
 */
@Service
public class CasoUsoConsultarPedidos {

    private final ServicioEjecucion servicioEjecucion;
    private final RepositorioPedido repositorio;
    private final MapeadorPedido mapeador;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param repositorio       persistencia de pedidos manuales
     * @param mapeador          conversion a DTO
     */
    public CasoUsoConsultarPedidos(ServicioEjecucion servicioEjecucion, RepositorioPedido repositorio,
                                   MapeadorPedido mapeador) {
        this.servicioEjecucion = servicioEjecucion;
        this.repositorio = repositorio;
        this.mapeador = mapeador;
    }

    /**
     * @param ejecucionId ejecucion a consultar
     * @return sus pedidos, en orden de registro
     */
    public List<RespuestaPedido> ejecutar(String ejecucionId) {
        Map<Integer, String> clientes = repositorio.listarPorEjecucion(ejecucionId).stream()
                .collect(Collectors.toMap(PedidoRegistrado::idEnEjecucion, PedidoRegistrado::cliente,
                        (primero, segundo) -> segundo));
        return servicioEjecucion.consultarPedidos(ejecucionId).stream()
                .map(pedido -> mapeador.aRespuesta(pedido, clientes.get(pedido.id())))
                .toList();
    }
}
