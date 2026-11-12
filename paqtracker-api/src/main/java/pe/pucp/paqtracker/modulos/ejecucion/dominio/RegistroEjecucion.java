package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Datos persistentes de una ejecucion: su configuracion, su resultado y el contexto para reproducirla. El
 * estado en vivo (flota, pedidos, reloj) se mantiene en memoria en el motor.
 *
 * @param id                identificador de la fila; en el dia a dia, uno por mes (dia-a-dia-YYYYMM)
 * @param nombre            nombre visible
 * @param tipoEscenario     escenario
 * @param estado            estado al momento de guardar
 * @param algoritmo         GA o IACO
 * @param fechaInicio       primer dia del horizonte
 * @param horaInicio        hora del primer dia en la que arranca el reloj
 * @param dias              dias del horizonte
 * @param factorAceleracion factor k
 * @param creadaEn          instante real de creacion; en el dia a dia, el primer arranque del mes
 * @param finalizadaEn      instante real de termino, o null
 * @param autos             autos de la flota
 * @param motos             motocicletas de la flota
 * @param bicicletas        bicicletas de la flota
 * @param resultado         metricas al guardar
 * @param colapso           instante y causa del colapso, o null
 * @param origenDatos       SISTEMA o ARCHIVO (lote subido para la corrida)
 * @param semilla           semilla del planificador, o null
 * @param parametros        parametros del dominio y rangos del semaforo vigentes, en JSON, o null
 * @param relojAlcanzado    instante simulado hasta el que llego, o null si aun no corre
 */
public record RegistroEjecucion(String id, String nombre, TipoEscenario tipoEscenario, EstadoEjecucion estado,
                                String algoritmo, LocalDate fechaInicio, LocalTime horaInicio, int dias,
                                double factorAceleracion, Instant creadaEn, Instant finalizadaEn, int autos,
                                int motos, int bicicletas, ResultadoEjecucion resultado, ColapsoRegistrado colapso,
                                String origenDatos, Long semilla, String parametros, Instant relojAlcanzado) {
}
