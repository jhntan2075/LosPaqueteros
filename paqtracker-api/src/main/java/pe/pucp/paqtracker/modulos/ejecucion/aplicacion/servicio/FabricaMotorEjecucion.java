package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.CodigosFlota;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.ServicioDifusion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio.ServicioPlanificacion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import java.time.Clock;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

/**
 * Arma un motor de ejecucion con todas sus piezas: simulacion (via el modulo de planificacion),
 * seguimiento de pedidos, reloj simulado y su ejecutor de un solo hilo.
 */
@Component
public class FabricaMotorEjecucion {

    private final ServicioPlanificacion servicioPlanificacion;
    private final ServicioDifusion servicioDifusion;
    private final RepositorioEjecucion repositorio;
    private final PropiedadesDominio propiedades;
    private final Clock relojPared;

    /**
     * @param servicioPlanificacion fachada de planificacion
     * @param servicioDifusion      fachada de difusion
     * @param repositorio           persistencia de ejecuciones
     * @param propiedades           parametros de la operacion
     * @param relojPared            reloj real
     */
    public FabricaMotorEjecucion(ServicioPlanificacion servicioPlanificacion, ServicioDifusion servicioDifusion,
                                 RepositorioEjecucion repositorio, PropiedadesDominio propiedades,
                                 Clock relojPared) {
        this.servicioPlanificacion = servicioPlanificacion;
        this.servicioDifusion = servicioDifusion;
        this.repositorio = repositorio;
        this.propiedades = propiedades;
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
                configuracion.saMinutos(), detenerEnColapso, configuracion.flota()));
        int primerIdLibre = Math.max(datos.idMinimoLibre(),
                datos.pedidos().stream().mapToInt(Pedido::getId).max().orElse(-1) + 1);
        SeguimientoPedidos seguimiento = new SeguimientoPedidos(datos.lineaTiempo(), propiedades.semaforo(),
                CodigosFlota.de(simulacion.getFlota()), primerIdLibre);
        RelojEjecucion reloj = new RelojEjecucion(relojPared, datos.minutoInicial(),
                configuracion.factorAceleracion());
        return new MotorEjecucion(configuracion, datos.lineaTiempo(), datos.minutoInicial(), datos.horizonte(),
                simulacion, seguimiento, reloj, relojPared, servicioDifusion, repositorio,
                crearEjecutor(configuracion.id()));
    }

    private static ScheduledExecutorService crearEjecutor(String idEjecucion) {
        return Executors.newSingleThreadScheduledExecutor(tarea -> {
            Thread hilo = new Thread(tarea, "motor-" + idEjecucion);
            hilo.setDaemon(true);
            return hilo;
        });
    }
}
