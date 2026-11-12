package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DetallePedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaDetallePedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.mapeador.MapeadorPedido;

/**
 * Parte de CU-04 Consultar pedidos: detalle de un pedido seleccionado con su trazabilidad dentro de la
 * ejecucion (registro, despacho, entregas) y su cliente (LE-077, LE-082).
 */
@Service
public class CasoUsoConsultarDetallePedido {

    private final ServicioEjecucion servicioEjecucion;
    private final MapeadorPedido mapeador;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param mapeador          conversion a DTO
     */
    public CasoUsoConsultarDetallePedido(ServicioEjecucion servicioEjecucion, MapeadorPedido mapeador) {
        this.servicioEjecucion = servicioEjecucion;
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
        return new RespuestaDetallePedido(ejecucionId,
                mapeador.aRespuesta(detalle.pedido(), detalle.pedido().cliente()),
                detalle.hitos());
    }
}
