package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador.MapeadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CreadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.MotorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.RegistroEjecuciones;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidosEnVivo;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.time.Clock;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Implementa CU-15 Ejecutar la operacion dia a dia: arranca, con reloj real (k = 1), la ejecucion
 * sobre el mes en curso. Hay una sola; si ya corre, la devuelve sin crear otra.
 */
@Service
public class CasoUsoEjecutarDiaADia {

    private static final Logger LOGGER = LoggerFactory.getLogger(CasoUsoEjecutarDiaADia.class);
    private static final double TIEMPO_REAL = 1.0;
    private static final String NOMBRE = "Operacion dia a dia";

    private final CargadorDatosEscenario cargadorDatos;
    private final CreadorEjecucion creador;
    private final RegistroEjecuciones registro;
    private final MapeadorEjecucion mapeador;
    private final PropiedadesDominio propiedades;
    private final PuertoPedidosEnVivo pedidosEnVivo;
    private final Clock relojPared;

    /**
     * @param cargadorDatos lector de los datos del mes
     * @param creador       alta comun de ejecuciones
     * @param registro      motores en memoria
     * @param mapeador      conversion a DTO
     * @param propiedades   parametros de la operacion
     * @param pedidosEnVivo pedidos registrados a mano en ejecuciones anteriores
     * @param relojPared    reloj real
     */
    public CasoUsoEjecutarDiaADia(CargadorDatosEscenario cargadorDatos, CreadorEjecucion creador,
                                  RegistroEjecuciones registro, MapeadorEjecucion mapeador,
                                  PropiedadesDominio propiedades, PuertoPedidosEnVivo pedidosEnVivo,
                                  Clock relojPared) {
        this.cargadorDatos = cargadorDatos;
        this.creador = creador;
        this.registro = registro;
        this.mapeador = mapeador;
        this.propiedades = propiedades;
        this.pedidosEnVivo = pedidosEnVivo;
        this.relojPared = relojPared;
    }

    /**
     * @return la ejecucion dia a dia en curso
     */
    public RespuestaEjecucion ejecutar() {
        Optional<MotorEjecucion> existente = registro.buscar(ServicioEjecucion.ID_DIA_A_DIA)
                .filter(motor -> !motor.getEstado().esTerminal());
        if (existente.isPresent()) {
            return mapeador.aRespuesta(existente.get());
        }
        ZonedDateTime ahora = ZonedDateTime.now(relojPared);
        DatosEscenario datos = recuperarPedidosEnVivo(cargadorDatos.cargarDiaADia(ahora), ahora);
        MotorEjecucion motor = creador.crear(ServicioEjecucion.ID_DIA_A_DIA, NOMBRE, TipoEscenario.DIA_A_DIA,
                AlgoritmoPlanificacion.desde(propiedades.planificador().algoritmo()),
                ahora.toLocalDate().withDayOfMonth(1), ahora.toLocalDate().lengthOfMonth(), TIEMPO_REAL, datos,
                ComposicionFlota.porDefecto());
        motor.iniciar();
        return mapeador.aRespuesta(motor);
    }

    /**
     * El estado vivo esta en memoria: si la API se reinicio, los pedidos registrados a mano antes del
     * reinicio se reincorporan si son de este mes y su plazo aun no vence (entran a la cola en el primer
     * paso). Los identificadores nuevos continuan despues del ultimo guardado para no repetirse.
     */
    private DatosEscenario recuperarPedidosEnVivo(DatosEscenario datos, ZonedDateTime ahora) {
        List<PuertoPedidosEnVivo.PedidoEnVivo> previos = pedidosEnVivo.listar(ServicioEjecucion.ID_DIA_A_DIA);
        int idMinimoLibre = previos.stream().mapToInt(PuertoPedidosEnVivo.PedidoEnVivo::idEnEjecucion)
                .max().orElse(-1) + 1;
        LineaTiempo lineaTiempo = datos.lineaTiempo();
        List<Pedido> vigentes = previos.stream()
                .filter(pedido -> pedido.horaLimite().isAfter(ahora.toInstant()))
                .filter(pedido -> !pedido.registradoEn().isBefore(lineaTiempo.getMinutoCero().toInstant()))
                .map(pedido -> new Pedido(pedido.idEnEjecucion(), new Nodo(pedido.x(), pedido.y()),
                        pedido.cantidad(), (int) Math.floor(lineaTiempo.aMinuto(
                                pedido.registradoEn().atZone(ahora.getZone()))), pedido.plazoMinutos()))
                .toList();
        if (!vigentes.isEmpty()) {
            LOGGER.info("Se recuperan {} pedidos registrados antes del reinicio", vigentes.size());
        }
        return datos.conPedidos(vigentes, idMinimoLibre);
    }
}
