package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudCreacionEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador.MapeadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CreadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.MotorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.util.UUID;

/**
 * Implementa CU-17 Ejecutar la simulacion hasta el colapso: crea la ejecucion con reloj acelerado que
 * se detiene en el primer pedido que no se puede entregar a tiempo. Queda CONFIGURADA.
 */
@Service
public class CasoUsoEjecutarColapso {

    private static final int LONGITUD_ID = 8;

    private final CargadorDatosEscenario cargadorDatos;
    private final CreadorEjecucion creador;
    private final MapeadorEjecucion mapeador;
    private final PropiedadesDominio propiedades;

    /**
     * @param cargadorDatos lector de los datos
     * @param creador       alta comun de ejecuciones
     * @param mapeador      conversion a DTO
     * @param propiedades   parametros de la operacion
     */
    public CasoUsoEjecutarColapso(CargadorDatosEscenario cargadorDatos, CreadorEjecucion creador,
                                  MapeadorEjecucion mapeador, PropiedadesDominio propiedades) {
        this.cargadorDatos = cargadorDatos;
        this.creador = creador;
        this.mapeador = mapeador;
        this.propiedades = propiedades;
    }

    /**
     * @param solicitud fecha de inicio y algoritmo; los dias de datos son los configurados
     * @return ejecucion creada, en estado CONFIGURADA
     */
    public RespuestaEjecucion ejecutar(SolicitudCreacionEjecucion solicitud) {
        int dias = propiedades.ejecucion().diasColapso();
        AlgoritmoPlanificacion algoritmo = AlgoritmoPlanificacion.desde(solicitud.algoritmo() == null
                ? propiedades.planificador().algoritmo() : solicitud.algoritmo());
        String id = "colapso-" + UUID.randomUUID().toString().substring(0, LONGITUD_ID);
        MotorEjecucion motor = creador.crear(id, "Simulacion hasta el colapso desde " + solicitud.fechaInicio(),
                TipoEscenario.COLAPSO_LOGISTICO, algoritmo, solicitud.fechaInicio(), dias,
                propiedades.ejecucion().factorColapso(), cargadorDatos.cargarRango(solicitud.fechaInicio(), dias));
        return mapeador.aRespuesta(motor);
    }
}
