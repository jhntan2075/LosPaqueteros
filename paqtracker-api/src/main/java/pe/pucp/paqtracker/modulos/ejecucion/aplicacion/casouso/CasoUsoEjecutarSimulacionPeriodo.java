package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
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
 * Implementa CU-16 Ejecutar la simulacion de un periodo: crea la ejecucion sobre los dias pedidos con
 * reloj acelerado. Queda CONFIGURADA; el reloj arranca con la accion iniciar.
 */
@Service
public class CasoUsoEjecutarSimulacionPeriodo {

    private static final int DIAS_POR_DEFECTO = 5;
    private static final int LONGITUD_ID = 8;

    private final CargadorDatosEscenario cargadorDatos;
    private final CreadorEjecucion creador;
    private final MapeadorEjecucion mapeador;
    private final PropiedadesDominio propiedades;

    /**
     * @param cargadorDatos lector de los datos del periodo
     * @param creador       alta comun de ejecuciones
     * @param mapeador      conversion a DTO
     * @param propiedades   parametros de la operacion
     */
    public CasoUsoEjecutarSimulacionPeriodo(CargadorDatosEscenario cargadorDatos, CreadorEjecucion creador,
                                            MapeadorEjecucion mapeador, PropiedadesDominio propiedades) {
        this.cargadorDatos = cargadorDatos;
        this.creador = creador;
        this.mapeador = mapeador;
        this.propiedades = propiedades;
    }

    /**
     * @param solicitud fecha de inicio, dias y algoritmo
     * @return ejecucion creada, en estado CONFIGURADA
     * @throws SolicitudInvalidaException si los dias exceden el maximo o no hay datos en el periodo
     */
    public RespuestaEjecucion ejecutar(SolicitudCreacionEjecucion solicitud) {
        int dias = solicitud.dias() == null ? DIAS_POR_DEFECTO : solicitud.dias();
        int maximo = propiedades.ejecucion().diasPeriodoMax();
        if (dias > maximo) {
            throw new SolicitudInvalidaException("El periodo admite hasta " + maximo + " dias: " + dias);
        }
        AlgoritmoPlanificacion algoritmo = AlgoritmoPlanificacion.desde(solicitud.algoritmo() == null
                ? propiedades.planificador().algoritmo() : solicitud.algoritmo());
        String id = "periodo-" + UUID.randomUUID().toString().substring(0, LONGITUD_ID);
        MotorEjecucion motor = creador.crear(id, "Simulacion de " + dias + " dias desde " + solicitud.fechaInicio(),
                TipoEscenario.SIMULACION_PERIODO, algoritmo, solicitud.fechaInicio(), dias,
                propiedades.ejecucion().factorPeriodo(), cargadorDatos.cargarRango(solicitud.fechaInicio(), dias));
        return mapeador.aRespuesta(motor);
    }
}
