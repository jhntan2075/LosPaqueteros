package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ParametrosEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ConfiguracionMotor;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.MotorEjecucion;

/**
 * Convierte un motor de ejecucion en su resumen para la API REST.
 */
@Component
public class MapeadorEjecucion {

    private final PropiedadesDominio.Semaforo semaforo;

    /**
     * @param propiedades parametros de la operacion
     */
    public MapeadorEjecucion(PropiedadesDominio propiedades) {
        this.semaforo = propiedades.semaforo();
    }

    /**
     * @param motor motor de la ejecucion
     * @return resumen con el reloj e indicadores de su ultima instantanea
     */
    public RespuestaEjecucion aRespuesta(MotorEjecucion motor) {
        ConfiguracionMotor configuracion = motor.getConfiguracion();
        MensajeEstadoEjecucion instantanea = motor.getUltimaInstantanea();
        ParametrosEjecucion parametros = new ParametrosEjecucion(configuracion.scSegundos(),
                configuracion.saMinutos(), configuracion.factorAceleracion(), semaforo.fraccionRojo(),
                semaforo.fraccionAmbar());
        return new RespuestaEjecucion(configuracion.id(), configuracion.nombre(),
                configuracion.tipoEscenario().name(), motor.getEstado().name(), configuracion.algoritmo().name(),
                configuracion.fechaInicio(), configuracion.dias(),
                instantanea == null ? null : instantanea.relojSimuladoFormateado(),
                instantanea == null ? null : instantanea.relojRealFormateado(), parametros,
                instantanea == null ? null : instantanea.indicadores(), configuracion.flota());
    }
}
