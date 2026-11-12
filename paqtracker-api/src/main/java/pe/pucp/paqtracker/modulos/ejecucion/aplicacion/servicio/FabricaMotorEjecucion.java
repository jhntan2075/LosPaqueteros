package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.ParametrosDominioApi;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RangosSemaforoApi;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteParametrosDominio;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteRangosSemaforo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.ServicioDifusion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidos;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.ServicioPlanificacion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

/**
 * Arma un motor de ejecucion con todas sus piezas: simulacion (via el modulo de planificacion),
 * seguimiento de pedidos, reloj simulado y su ejecutor de un solo hilo.
 */
@Component
public class FabricaMotorEjecucion {

    private static final Logger LOGGER = LoggerFactory.getLogger(FabricaMotorEjecucion.class);

    private final ServicioPlanificacion servicioPlanificacion;
    private final ServicioDifusion servicioDifusion;
    private final RepositorioEjecucion repositorio;
    private final PropiedadesDominio propiedades;
    private final FuenteRangosSemaforo semaforo;
    private final FuenteParametrosDominio parametros;
    private final PuertoPedidos pedidos;
    private final JsonMapper json;
    private final Clock relojPared;

    /**
     * @param servicioPlanificacion fachada de planificacion
     * @param servicioDifusion      fachada de difusion
     * @param repositorio           persistencia de ejecuciones
     * @param propiedades           parametros de la operacion
     * @param semaforo              rangos del semaforo vigentes, que cada motor consulta en vivo
     * @param parametros            parametros del dominio vigentes, que cada ejecucion copia al crearse
     * @param pedidos               pedidos guardados, donde el dia a dia escribe su avance
     * @param json                  serializacion de los parametros que se guardan con cada ejecucion
     * @param relojPared            reloj real
     */
    public FabricaMotorEjecucion(ServicioPlanificacion servicioPlanificacion, ServicioDifusion servicioDifusion,
                                 RepositorioEjecucion repositorio, PropiedadesDominio propiedades,
                                 FuenteRangosSemaforo semaforo, FuenteParametrosDominio parametros,
                                 PuertoPedidos pedidos, JsonMapper json, Clock relojPared) {
        this.servicioPlanificacion = servicioPlanificacion;
        this.servicioDifusion = servicioDifusion;
        this.repositorio = repositorio;
        this.propiedades = propiedades;
        this.semaforo = semaforo;
        this.parametros = parametros;
        this.pedidos = pedidos;
        this.json = json;
        this.relojPared = relojPared;
    }

    /**
     * @param configuracion    parametros fijos de la ejecucion
     * @param datos            pedidos, bloqueos y linea de tiempo
     * @param detenerEnColapso verdadero para la simulacion hasta el colapso
     * @return motor configurado, aun sin preparar ni iniciar
     */
    public MotorEjecucion crear(ConfiguracionMotor configuracion, DatosEscenario datos, boolean detenerEnColapso) {
        SimulacionEnCurso simulacion = servicioPlanificacion.prepararSimulacion(new SolicitudPreparacionSimulacion(
                datos.pedidos(), datos.bloqueos(), configuracion.algoritmo(), propiedades.planificador().semilla(),
                configuracion.saMinutos(), detenerEnColapso, configuracion.flota(), parametros.vigentes()));
        int primerIdLibre = datos.pedidos().stream().mapToInt(Pedido::getId).max().orElse(-1) + 1;
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(datos.lineaTiempo(), semaforo,
                CodigosFlota.de(simulacion.getFlota()), primerIdLibre, datos.entregadasPrevias());
        boolean diaADia = configuracion.tipoEscenario() == TipoEscenario.DIA_A_DIA;
        PersistenciaEjecucion persistencia = new PersistenciaEjecucion(repositorio,
                diaADia ? pedidos::registrarAvance : avances -> { }, datos.origenDatos(),
                propiedades.planificador().semilla(), parametrosVigentes(), datos.resultadoPrevio());
        RelojEjecucion reloj = new RelojEjecucion(relojPared, datos.minutoInicial(),
                configuracion.factorAceleracion());
        return new MotorEjecucion(configuracion, datos.lineaTiempo(), datos.minutoInicial(), datos.horizonte(),
                simulacion, seguimiento, reloj, relojPared, servicioDifusion, persistencia,
                crearEjecutor(configuracion.id()));
    }

    /**
     * Parametros del dominio y rangos del semaforo con los que corre la ejecucion, para reproducirla. Si no se
     * pueden serializar se guarda la ejecucion sin ellos: no es motivo para no correrla.
     */
    private String parametrosVigentes() {
        try {
            return json.writeValueAsString(Map.of("dominio", ParametrosDominioApi.desde(parametros.vigentes()),
                    "semaforo", RangosSemaforoApi.desde(semaforo.vigentes())));
        } catch (JacksonException excepcion) {
            LOGGER.warn("No se pudieron serializar los parametros de la ejecucion", excepcion);
            return null;
        }
    }

    private static ScheduledExecutorService crearEjecutor(String idEjecucion) {
        return Executors.newSingleThreadScheduledExecutor(tarea -> {
            Thread hilo = new Thread(tarea, "motor-" + idEjecucion);
            hilo.setDaemon(true);
            return hilo;
        });
    }
}
