package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador.MapeadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.MotorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.RegistroEjecuciones;

/**
 * Controla el reloj de una ejecucion de CU-15, CU-16 o CU-17: iniciarla o reanudarla, pausarla o
 * detenerla antes de su horizonte.
 */
@Service
public class CasoUsoControlarEjecucion {

    /** Acciones sobre el reloj de una ejecucion. */
    public enum Accion {
        /** Arranca o reanuda el reloj. */
        INICIAR,
        /** Detiene el reloj conservando el estado. */
        PAUSAR,
        /** Termina la ejecucion. */
        DETENER
    }

    private final RegistroEjecuciones registro;
    private final MapeadorEjecucion mapeador;

    /**
     * @param registro motores en memoria
     * @param mapeador conversion a DTO
     */
    public CasoUsoControlarEjecucion(RegistroEjecuciones registro, MapeadorEjecucion mapeador) {
        this.registro = registro;
        this.mapeador = mapeador;
    }

    /**
     * @param id     identificador de la ejecucion
     * @param accion accion a aplicar
     * @return ejecucion con su nuevo estado
     */
    public RespuestaEjecucion ejecutar(String id, Accion accion) {
        MotorEjecucion motor = registro.obtener(id);
        switch (accion) {
            case INICIAR -> motor.iniciar();
            case PAUSAR -> motor.pausar();
            case DETENER -> motor.detener();
        }
        return mapeador.aRespuesta(motor);
    }
}
