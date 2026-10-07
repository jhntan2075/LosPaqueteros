package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Datos persistentes de una ejecucion: su configuracion y su resultado final. El estado en vivo
 * (flota, pedidos, reloj) se mantiene en memoria en el motor.
 *
 * @param id                 identificador de la ejecucion
 * @param tipoEscenario      escenario
 * @param estado             estado al momento de guardar
 * @param algoritmo          GA o IACO
 * @param fechaInicio        primer dia del horizonte
 * @param dias               dias del horizonte
 * @param factorAceleracion  factor k
 * @param creadaEn           instante real de creacion
 * @param finalizadaEn       instante real de termino, o null
 * @param entregas           entregas realizadas al guardar
 * @param incumplimientos    entregas fuera de plazo al guardar
 * @param fechaColapso       fecha simulada del colapso, o null
 */
public record RegistroEjecucion(String id, TipoEscenario tipoEscenario, EstadoEjecucion estado, String algoritmo,
                                LocalDate fechaInicio, int dias, double factorAceleracion, Instant creadaEn,
                                Instant finalizadaEn, int entregas, int incumplimientos, Instant fechaColapso) {
}
