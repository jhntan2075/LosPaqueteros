package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/**
 * Parametros fijos de un motor de ejecucion.
 *
 * @param id                identificador de la ejecucion
 * @param nombre            nombre visible
 * @param tipoEscenario     escenario
 * @param algoritmo         metaheuristica
 * @param fechaInicio       primer dia del horizonte
 * @param horaInicio        hora del primer dia en la que arranca el reloj
 * @param dias              dias del horizonte
 * @param factorAceleracion factor k
 * @param scSegundos        segundos reales entre difusiones
 * @param saMinutos         minutos simulados entre planificaciones
 * @param maxPasosPorTick   pasos Sa como maximo por difusion
 * @param creadaEn          instante real de creacion
 * @param flota             composicion de la flota
 */
public record ConfiguracionMotor(String id, String nombre, TipoEscenario tipoEscenario,
                                 AlgoritmoPlanificacion algoritmo, LocalDate fechaInicio, LocalTime horaInicio, int dias,
                                 double factorAceleracion, int scSegundos, int saMinutos, int maxPasosPorTick,
                                 Instant creadaEn, ComposicionFlota flota) {

    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");

    /**
     * Fila de la base en la que se guarda. El dia a dia conserva su id en memoria (lo usan la interfaz y los
     * topicos) pero guarda una fila por mes, para que cada mes tenga su propio historial y un reinicio no la
     * pise con otro mes.
     *
     * @return id de la fila en la tabla de ejecuciones
     */
    public String idRegistro() {
        return tipoEscenario == TipoEscenario.DIA_A_DIA ? idRegistroDiaADia(id, fechaInicio) : id;
    }

    /**
     * @param id          id del dia a dia en memoria
     * @param fechaInicio primer dia del mes que opera
     * @return id de la fila del mes, p. ej. dia-a-dia-202611
     */
    public static String idRegistroDiaADia(String id, LocalDate fechaInicio) {
        return id + "-" + fechaInicio.format(FORMATO_MES);
    }
}
