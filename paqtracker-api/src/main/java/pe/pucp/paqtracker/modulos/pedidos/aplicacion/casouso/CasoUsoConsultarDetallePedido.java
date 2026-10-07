package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DetallePedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaDetallePedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.mapeador.MapeadorPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;

/**
 * Parte de CU-04 Consultar pedidos: detalle de un pedido seleccionado con su trazabilidad dentro de la
 * ejecucion (registro, despacho, entregas) y su cliente si se registro a mano (LE-077, LE-082).
 */
@Service
public class CasoUsoConsultarDetallePedido {

    private final ServicioEjecucion servicioEjecucion;
    private final RepositorioPedido repositorio;
    private final MapeadorPedido mapeador;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param repositorio       persistencia de pedidos manuales
     * @param mapeador          conversion a DTO
     */
    public CasoUsoConsultarDetallePedido(ServicioEjecucion servicioEjecucion, RepositorioPedido repositorio,
                                         MapeadorPedido mapeador) {
        this.servicioEjecucion = servicioEjecucion;
        this.repositorio = repositorio;
        this.mapeador = mapeador;
    }

    /**
     * @param ejecucionId ejecucion a consultar
     * @param codigo      codigo del pedido, p. ej. P-00042
     * @return pedido con su trazabilidad
     * @throws SolicitudInvalidaException si el codigo no tiene el formato P-NNNNN
     */
    public RespuestaDetallePedido ejecutar(String ejecucionId, String codigo) {
        int idPedido;
        try {
            idPedido = NomenclaturaOperacion.idDePedido(codigo);
        } catch (IllegalArgumentException excepcion) {
            throw new SolicitudInvalidaException(excepcion.getMessage(), excepcion);
        }
        DetallePedido detalle = servicioEjecucion.consultarPedido(ejecucionId, idPedido);
        String cliente = repositorio.listarPorEjecucion(ejecucionId).stream()
                .filter(pedido -> pedido.idEnEjecucion() == idPedido)
                .map(PedidoRegistrado::cliente).findFirst().orElse(null);
        return new RespuestaDetallePedido(ejecucionId, mapeador.aRespuesta(detalle.pedido(), cliente),
                detalle.hitos());
    }
}
