package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Parametros fijos de un motor de ejecucion.
 *
 * @param id                identificador de la ejecucion
 * @param nombre            nombre visible
 * @param tipoEscenario     escenario
 * @param algoritmo         metaheuristica
 * @param fechaInicio       primer dia del horizonte
 * @param dias              dias del horizonte
 * @param factorAceleracion factor k
 * @param scSegundos        segundos reales entre difusiones
 * @param saMinutos         minutos simulados entre planificaciones
 * @param maxPasosPorTick   pasos Sa como maximo por difusion
 * @param creadaEn          instante real de creacion
 */
public record ConfiguracionMotor(String id, String nombre, TipoEscenario tipoEscenario,
                                 AlgoritmoPlanificacion algoritmo, LocalDate fechaInicio, int dias,
                                 double factorAceleracion, int scSegundos, int saMinutos, int maxPasosPorTick,
                                 Instant creadaEn) {
}
