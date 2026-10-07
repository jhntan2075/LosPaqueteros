package pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.util.List;

/**
 * Datos para preparar la simulacion de una ejecucion.
 *
 * @param pedidos          pedidos del horizonte, con instantes relativos al minuto cero de la ejecucion
 * @param bloqueos         bloqueos programados, con la misma linea de tiempo
 * @param algoritmo        metaheuristica de cada ciclo
 * @param semilla          semilla base, para reproducibilidad
 * @param saMinutos        salto del algoritmo Sa, en minutos simulados
 * @param detenerEnColapso verdadero para detenerse en el primer incumplimiento (CU-17)
 * @param flota            composicion de la flota
 */
public record SolicitudPreparacionSimulacion(List<Pedido> pedidos, List<Bloqueo> bloqueos,
                                             AlgoritmoPlanificacion algoritmo, long semilla, int saMinutos,
                                             boolean detenerEnColapso, ComposicionFlota flota) {
}
