package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Motores de las ejecuciones de esta instancia de la API, en memoria. Es lo que permite que cualquier
 * dispositivo que se conecte vea cualquiera de los escenarios en curso.
 */
@Component
public class RegistroEjecuciones {

    private final Map<String, MotorEjecucion> motores = new ConcurrentHashMap<>();

    /**
     * @param motor motor a registrar
     */
    public void agregar(MotorEjecucion motor) {
        motores.put(motor.getConfiguracion().id(), motor);
    }

    /**
     * @param id identificador de la ejecucion
     * @return motor de la ejecucion
     * @throws RecursoNoEncontradoException si no existe
     */
    public MotorEjecucion obtener(String id) {
        MotorEjecucion motor = motores.get(id);
        if (motor == null) {
            throw new RecursoNoEncontradoException("ejecucion", id);
        }
        return motor;
    }

    /**
     * @param id identificador de la ejecucion
     * @return motor, o vacio si no existe
     */
    public Optional<MotorEjecucion> buscar(String id) {
        return Optional.ofNullable(motores.get(id));
    }

    /**
     * @return motores ordenados por fecha de creacion
     */
    public List<MotorEjecucion> listar() {
        return motores.values().stream()
                .sorted(Comparator.comparing(motor -> motor.getConfiguracion().creadaEn())).toList();
    }

    /**
     * @return simulaciones (no dia a dia) que aun no terminan
     */
    public long contarSimulacionesActivas() {
        return motores.values().stream()
                .filter(motor -> motor.getConfiguracion().tipoEscenario() != TipoEscenario.DIA_A_DIA)
                .filter(motor -> !motor.getEstado().esTerminal()).count();
    }
}
