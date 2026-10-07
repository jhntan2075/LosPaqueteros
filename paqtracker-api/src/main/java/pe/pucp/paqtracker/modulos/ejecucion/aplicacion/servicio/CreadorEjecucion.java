package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.OperacionNoPermitidaException;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.time.Clock;
import java.time.LocalDate;

/**
 * Alta comun de una ejecucion: valida el cupo de simulaciones, arma el motor, lo registra y difunde
 * su primera instantanea. Lo comparten los casos de uso CU-15, CU-16 y CU-17.
 */
@Component
public class CreadorEjecucion {

    private final FabricaMotorEjecucion fabrica;
    private final RegistroEjecuciones registro;
    private final PropiedadesDominio.Ejecucion parametros;
    private final Clock relojPared;

    /**
     * @param fabrica     fabrica de motores
     * @param registro    motores en memoria
     * @param propiedades parametros de la operacion
     * @param relojPared  reloj real
     */
    public CreadorEjecucion(FabricaMotorEjecucion fabrica, RegistroEjecuciones registro,
                            PropiedadesDominio propiedades, Clock relojPared) {
        this.fabrica = fabrica;
        this.registro = registro;
        this.parametros = propiedades.ejecucion();
        this.relojPared = relojPared;
    }

    /**
     * @param id                identificador de la ejecucion
     * @param nombre            nombre visible
     * @param tipo              escenario
     * @param algoritmo         metaheuristica
     * @param fechaInicio       primer dia del horizonte
     * @param dias              dias del horizonte
     * @param factorAceleracion factor k
     * @param datos             pedidos, bloqueos y linea de tiempo
     * @return motor registrado y preparado, en estado CONFIGURADA
     * @throws OperacionNoPermitidaException si ya se alcanzo el maximo de simulaciones simultaneas
     */
    public MotorEjecucion crear(String id, String nombre, TipoEscenario tipo, AlgoritmoPlanificacion algoritmo,
                                LocalDate fechaInicio, int dias, double factorAceleracion, DatosEscenario datos) {
        if (tipo != TipoEscenario.DIA_A_DIA && registro.contarSimulacionesActivas() >= parametros.maxSimultaneas()) {
            throw new OperacionNoPermitidaException("Ya hay " + parametros.maxSimultaneas()
                    + " simulaciones sin terminar; detenga una antes de crear otra");
        }
        ConfiguracionMotor configuracion = new ConfiguracionMotor(id, nombre, tipo, algoritmo, fechaInicio, dias,
                factorAceleracion, parametros.scSegundos(), parametros.saMinutos(), parametros.maxPasosPorTick(),
                relojPared.instant());
        MotorEjecucion motor = fabrica.crear(configuracion, datos, tipo == TipoEscenario.COLAPSO_LOGISTICO);
        motor.preparar();
        registro.agregar(motor);
        return motor;
    }
}
