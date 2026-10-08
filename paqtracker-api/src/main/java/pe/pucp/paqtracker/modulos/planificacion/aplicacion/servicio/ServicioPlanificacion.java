package pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.planificador.comun.ContadorEvaluaciones;
import pe.pucp.paqtracker.simulacion.Orquestador;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.util.Malla;
import java.util.List;

/**
 * Fachada del modulo de planificacion (CU-06, CU-07, CU-12). Arma la simulacion de una ejecucion con
 * su propio escenario (almacenes, flota, malla) y su fabrica de algoritmos; la planificacion y el
 * despacho ocurren dentro de cada paso de {@link SimulacionEnCurso}, que conduce el modulo de ejecucion.
 */
@Service
public class ServicioPlanificacion {

    private final FabricaAlgoritmo fabricaAlgoritmo;

    /**
     * @param fabricaAlgoritmo fabrica de los algoritmos de cada ciclo
     */
    public ServicioPlanificacion(FabricaAlgoritmo fabricaAlgoritmo) {
        this.fabricaAlgoritmo = fabricaAlgoritmo;
    }

    /**
     * Prepara una simulacion lista para su primer paso. Cada llamada crea almacenes, flota y malla
     * nuevos: las ejecuciones corren en hilos distintos y no deben compartir estado mutable.
     *
     * @param solicitud datos de la simulacion
     * @return simulacion que el motor de ejecucion avanza paso a paso
     */
    public SimulacionEnCurso prepararSimulacion(SolicitudPreparacionSimulacion solicitud) {
        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(almacenes.get(0), solicitud.flota().autos(),
                solicitud.flota().motos(), solicitud.flota().bicicletas());
        Orquestador orquestador = new Orquestador(almacenes, flota, solicitud.pedidos(), List.of(),
                new Malla(solicitud.bloqueos()), solicitud.saMinutos(),
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS, ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS,
                ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS, solicitud.semilla(),
                fabricaAlgoritmo.crear(solicitud.algoritmo(), new ContadorEvaluaciones()));
        return orquestador.iniciar(solicitud.detenerEnColapso());
    }
}
