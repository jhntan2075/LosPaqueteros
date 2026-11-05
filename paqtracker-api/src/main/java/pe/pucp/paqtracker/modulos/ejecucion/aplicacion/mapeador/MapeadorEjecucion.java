package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteRangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
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

    private final FuenteRangosSemaforo semaforo;

    /**
     * @param semaforo rangos del semaforo vigentes
     */
    public MapeadorEjecucion(FuenteRangosSemaforo semaforo) {
        this.semaforo = semaforo;
    }

    /**
     * @param motor motor de la ejecucion
     * @return resumen con el reloj e indicadores de su ultima instantanea
     */
    public RespuestaEjecucion aRespuesta(MotorEjecucion motor) {
        ConfiguracionMotor configuracion = motor.getConfiguracion();
        MensajeEstadoEjecucion instantanea = motor.getUltimaInstantanea();
        RangosSemaforo.CortesPorDebajo holgura = semaforo.vigentes().holgura();
        ParametrosEjecucion parametros = new ParametrosEjecucion(configuracion.scSegundos(),
                configuracion.saMinutos(), configuracion.factorAceleracion(), holgura.rojo(), holgura.ambar());
        return new RespuestaEjecucion(configuracion.id(), configuracion.nombre(),
                configuracion.tipoEscenario().name(), motor.getEstado().name(), configuracion.algoritmo().name(),
                configuracion.fechaInicio(), configuracion.horaInicio(), configuracion.dias(),
                instantanea == null ? null : instantanea.relojSimuladoFormateado(),
                instantanea == null ? null : instantanea.relojRealFormateado(), parametros,
                instantanea == null ? null : instantanea.indicadores(), configuracion.flota());
    }
}
