package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ResultadoRegistroPedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudPedidoEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaRegistroPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.SolicitudRegistroPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.mapeador.MapeadorPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.time.Instant;

/**
 * Implementa CU-01 Registrar pedido manualmente: valida el pedido contra el dominio, lo ingresa a la
 * operacion dia a dia en el instante actual (que replanifica de inmediato, CU-12) y lo guarda.
 */
@Service
public class CasoUsoRegistrarPedido {

    private static final int MINUTOS_POR_HORA = 60;

    private final ServicioEjecucion servicioEjecucion;
    private final RepositorioPedido repositorio;
    private final MapeadorPedido mapeador;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param repositorio       persistencia de pedidos
     * @param mapeador          conversion a DTO
     */
    public CasoUsoRegistrarPedido(ServicioEjecucion servicioEjecucion, RepositorioPedido repositorio,
                                  MapeadorPedido mapeador) {
        this.servicioEjecucion = servicioEjecucion;
        this.repositorio = repositorio;
        this.mapeador = mapeador;
    }

    /**
     * @param solicitud datos del pedido
     * @return pedido con su estado tras la replanificacion
     * @throws SolicitudInvalidaException si el destino esta fuera de la malla, la cantidad excede la
     *                                    capacidad de un auto o el plazo excede el maximo
     */
    public RespuestaRegistroPedido ejecutar(SolicitudRegistroPedido solicitud) {
        validar(solicitud);
        ResultadoRegistroPedido resultado = servicioEjecucion.registrarPedido(ServicioEjecucion.ID_DIA_A_DIA,
                new SolicitudPedidoEnVivo(solicitud.x(), solicitud.y(), solicitud.cantidad(),
                        solicitud.plazoHoras() * MINUTOS_POR_HORA));
        PedidoEnMapa pedido = resultado.pedido();
        repositorio.guardar(new PedidoRegistrado(null, resultado.ejecucionId(), pedido.id(), solicitud.cliente(),
                solicitud.x(), solicitud.y(), solicitud.cantidad(), solicitud.plazoHoras(),
                Instant.ofEpochMilli(pedido.registroMs()), Instant.ofEpochMilli(pedido.horaLimiteMs())));
        return new RespuestaRegistroPedido(resultado.ejecucionId(), mapeador.aRespuesta(pedido, solicitud.cliente()),
                resultado.replanifico(), resultado.tiempoComputoMs(), resultado.unidadesDespachadas());
    }

    private static void validar(SolicitudRegistroPedido solicitud) {
        if (solicitud.x() > ConfiguracionDominio.MALLA_ANCHO || solicitud.y() > ConfiguracionDominio.MALLA_ALTO) {
            throw new SolicitudInvalidaException("El destino (" + solicitud.x() + "," + solicitud.y()
                    + ") esta fuera de la malla de " + ConfiguracionDominio.MALLA_ANCHO + "x"
                    + ConfiguracionDominio.MALLA_ALTO + " km");
        }
        if (solicitud.plazoHoras() * MINUTOS_POR_HORA > ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS) {
            throw new SolicitudInvalidaException("El plazo maximo es de "
                    + ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS / MINUTOS_POR_HORA + " h: " + solicitud.plazoHoras());
        }
    }
}
