package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DetallePedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ResultadoRegistroPedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudPedidoEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador.MapeadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import java.time.Clock;
import java.util.List;

/**
 * Fachada del modulo de ejecucion para consultas y para los demas modulos (el registro de pedidos
 * entra por aqui a la ejecucion en curso).
 */
@Service
public class ServicioEjecucion {

    /** Identificador fijo de la operacion dia a dia. */
    public static final String ID_DIA_A_DIA = "dia-a-dia";

    private final RegistroEjecuciones registro;
    private final MapeadorEjecucion mapeador;
    private final RepositorioEjecucion repositorio;
    private final Clock relojPared;

    /**
     * @param registro    motores en memoria
     * @param mapeador    conversion a DTO
     * @param repositorio persistencia de ejecuciones
     * @param relojPared  reloj real
     */
    public ServicioEjecucion(RegistroEjecuciones registro, MapeadorEjecucion mapeador,
                             RepositorioEjecucion repositorio, Clock relojPared) {
        this.registro = registro;
        this.mapeador = mapeador;
        this.repositorio = repositorio;
        this.relojPared = relojPared;
    }

    /**
     * Cierra en la base las ejecuciones que una instancia anterior de la API dejo sin terminar. Se
     * invoca al arrancar, antes de crear ejecuciones nuevas.
     *
     * @return cantidad de ejecuciones cerradas
     */
    public int cerrarInterrumpidas() {
        return repositorio.cerrarInterrumpidas(relojPared.instant());
    }

    /**
     * @return resumen de todas las ejecuciones, de la mas antigua a la mas nueva
     */
    public List<RespuestaEjecucion> listar() {
        return registro.listar().stream().map(mapeador::aRespuesta).toList();
    }

    /**
     * @param id identificador de la ejecucion
     * @return resumen de la ejecucion
     */
    public RespuestaEjecucion consultar(String id) {
        return mapeador.aRespuesta(registro.obtener(id));
    }

    /**
     * @param id identificador de la ejecucion
     * @return ultima instantanea difundida, para quien se conecta tarde
     */
    public MensajeEstadoEjecucion instantanea(String id) {
        return registro.obtener(id).getUltimaInstantanea();
    }

    /**
     * @param id        ejecucion en la que se registra el pedido
     * @param solicitud datos del pedido, ya validados
     * @return pedido con su estado tras la replanificacion
     */
    public ResultadoRegistroPedido registrarPedido(String id, SolicitudPedidoEnVivo solicitud) {
        return registro.obtener(id).registrarPedido(solicitud);
    }

    /**
     * @param id identificador de la ejecucion
     * @return todos sus pedidos con su estado
     */
    public List<PedidoEnMapa> consultarPedidos(String id) {
        return registro.obtener(id).consultarPedidos();
    }

    /**
     * @param id       identificador de la ejecucion
     * @param idPedido identificador del pedido en la ejecucion
     * @return pedido con su trazabilidad
     * @throws RecursoNoEncontradoException si la ejecucion o el pedido no existen
     */
    public DetallePedido consultarPedido(String id, int idPedido) {
        return registro.obtener(id).consultarPedido(idPedido)
                .orElseThrow(() -> new RecursoNoEncontradoException("pedido", idPedido + " en la ejecucion " + id));
    }
}
