package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteRangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ParametrosEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.ResultadoGuardado;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ConfiguracionMotor;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.MotorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import java.time.ZoneId;

/**
 * Convierte un motor de ejecucion en su resumen para la API REST.
 */
@Component
public class MapeadorEjecucion {

    private final FuenteRangosSemaforo semaforo;
    private final ZoneId zona;

    /**
     * @param semaforo    rangos del semaforo vigentes
     * @param propiedades parametros de la operacion, con la zona horaria
     */
    public MapeadorEjecucion(FuenteRangosSemaforo semaforo, PropiedadesDominio propiedades) {
        this.semaforo = semaforo;
        this.zona = ZoneId.of(propiedades.ejecucion().zonaHoraria());
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
                instantanea == null ? null : instantanea.indicadores(), configuracion.flota(), false, null);
    }

    /**
     * @param registro ejecucion guardada que ya no esta en memoria
     * @return resumen con su resultado; sin parametros de reloj ni indicadores en vivo
     */
    public RespuestaEjecucion aRespuesta(RegistroEjecucion registro) {
        String reloj = registro.relojAlcanzado() == null ? null
                : LineaTiempo.formatear(registro.relojAlcanzado().atZone(zona));
        return new RespuestaEjecucion(registro.id(), registro.nombre() == null ? registro.id() : registro.nombre(),
                registro.tipoEscenario().name(), registro.estado().name(), registro.algoritmo(),
                registro.fechaInicio(), registro.horaInicio(), registro.dias(), reloj, null, null, null,
                new ComposicionFlota(registro.autos(), registro.motos(), registro.bicicletas()), true,
                ResultadoGuardado.de(registro));
    }
}
