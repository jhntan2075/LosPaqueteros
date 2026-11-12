package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.mapeador.MapeadorPedido;
import java.util.List;

/**
 * Implementa CU-04 Consultar pedidos: lista los pedidos de una ejecucion con su estado, unidad asignada,
 * llegada estimada, nivel de holgura y cliente (el del archivo o el registrado a mano, que el pedido trae desde
 * la base).
 */
@Service
public class CasoUsoConsultarPedidos {

    private final ServicioEjecucion servicioEjecucion;
    private final MapeadorPedido mapeador;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param mapeador          conversion a DTO
     */
    public CasoUsoConsultarPedidos(ServicioEjecucion servicioEjecucion, MapeadorPedido mapeador) {
        this.servicioEjecucion = servicioEjecucion;
        this.mapeador = mapeador;
    }

    /**
     * @param ejecucionId ejecucion a consultar
     * @return sus pedidos, en orden de registro
     */
    public List<RespuestaPedido> ejecutar(String ejecucionId) {
        return servicioEjecucion.consultarPedidos(ejecucionId).stream()
                .map(pedido -> mapeador.aRespuesta(pedido, pedido.cliente()))
                .toList();
    }
}
