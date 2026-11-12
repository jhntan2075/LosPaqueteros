package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.OperacionNoPermitidaException;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ResultadoRegistroPedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudPedidoEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ConfiguracionMotor;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaRegistroPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.SolicitudRegistroPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.mapeador.MapeadorPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.OrigenPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;

/**
 * Implementa CU-01 Registrar pedido manualmente: valida el pedido contra el dominio, lo guarda y lo ingresa a la
 * operacion dia a dia en el instante actual (que replanifica de inmediato, CU-12). Se guarda primero para que
 * el pedido tenga en el motor el mismo id que en la base, que es con el que se retoma tras un reinicio.
 */
@Service
public class CasoUsoRegistrarPedido {

    private static final int MINUTOS_POR_HORA = 60;

    private final ServicioEjecucion servicioEjecucion;
    private final RepositorioPedido repositorio;
    private final MapeadorPedido mapeador;
    private final Clock relojPared;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param repositorio       persistencia de pedidos
     * @param mapeador          conversion a DTO
     * @param relojPared        reloj real
     */
    public CasoUsoRegistrarPedido(ServicioEjecucion servicioEjecucion, RepositorioPedido repositorio,
                                  MapeadorPedido mapeador, Clock relojPared) {
        this.servicioEjecucion = servicioEjecucion;
        this.repositorio = repositorio;
        this.mapeador = mapeador;
        this.relojPared = relojPared;
    }

    /**
     * @param solicitud datos del pedido
     * @return pedido con su estado tras la replanificacion
     * @throws SolicitudInvalidaException si el destino esta fuera de la malla, la cantidad excede la
     *                                    capacidad de un auto o el plazo excede el maximo
     */
    public RespuestaRegistroPedido ejecutar(SolicitudRegistroPedido solicitud) {
        validar(solicitud);
        PedidoRegistrado guardado = guardarProvisional(solicitud);
        ResultadoRegistroPedido resultado;
        try {
            resultado = servicioEjecucion.registrarPedido(ServicioEjecucion.ID_DIA_A_DIA,
                    new SolicitudPedidoEnVivo(solicitud.x(), solicitud.y(), solicitud.cantidad(),
                            solicitud.plazoHoras() * MINUTOS_POR_HORA, Math.toIntExact(guardado.id()),
                            solicitud.cliente()));
        } catch (RecursoNoEncontradoException | OperacionNoPermitidaException excepcion) {
            // La operacion no lo recibio: no debe quedar un pedido que nadie va a atender.
            repositorio.borrar(guardado.id());
            throw excepcion;
        }
        PedidoEnMapa pedido = resultado.pedido();
        repositorio.actualizarRegistro(guardado.id(), Instant.ofEpochMilli(pedido.registroMs()),
                Instant.ofEpochMilli(pedido.horaLimiteMs()));
        return new RespuestaRegistroPedido(resultado.ejecucionId(), mapeador.aRespuesta(pedido, solicitud.cliente()),
                resultado.replanifico(), resultado.tiempoComputoMs(), resultado.unidadesDespachadas());
    }

    /**
     * Guarda el pedido con el reloj real como registro provisional; el motor fija el definitivo (el minuto del
     * reloj de la operacion) y se actualiza despues.
     */
    private PedidoRegistrado guardarProvisional(SolicitudRegistroPedido solicitud) {
        ZonedDateTime ahora = ZonedDateTime.now(relojPared);
        String ejecucionId = ConfiguracionMotor.idRegistroDiaADia(ServicioEjecucion.ID_DIA_A_DIA,
                ahora.toLocalDate().withDayOfMonth(1));
        Instant registro = ahora.toInstant();
        return repositorio.guardar(new PedidoRegistrado(null, OrigenPedido.MANUAL, null, null, null, ejecucionId,
                solicitud.cliente(), solicitud.x(), solicitud.y(), solicitud.cantidad(), solicitud.plazoHoras(),
                registro, registro.plus(Duration.ofHours(solicitud.plazoHoras())), null, 0));
    }

    private static void validar(SolicitudRegistroPedido solicitud) {
        if (solicitud.x() > ConfiguracionDominio.MALLA_ANCHO || solicitud.y() > ConfiguracionDominio.MALLA_ALTO) {
            throw new SolicitudInvalidaException("El destino (" + solicitud.x() + "," + solicitud.y()
                    + ") esta fuera de la malla de " + ConfiguracionDominio.MALLA_ANCHO + "x"
                    + ConfiguracionDominio.MALLA_ALTO + " km");
        }
        if (solicitud.plazoHoras() * MINUTOS_POR_HORA > ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS) {
            throw new SolicitudInvalidaException("El plazo máximo es de "
                    + ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS / MINUTOS_POR_HORA + " h: " + solicitud.plazoHoras());
        }
    }
}
