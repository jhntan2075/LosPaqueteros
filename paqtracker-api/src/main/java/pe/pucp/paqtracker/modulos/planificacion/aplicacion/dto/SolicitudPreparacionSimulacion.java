package pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.ParametrosDominio;
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
 * @param parametros       almacenes, atributos de las unidades y duraciones de averia de la ejecucion
 * @param mantenimientos   mantenimientos preventivos del horizonte, con la misma linea de tiempo; los de
 *                         unidades que no estan en la flota se ignoran
 */
public record SolicitudPreparacionSimulacion(List<Pedido> pedidos, List<Bloqueo> bloqueos,
                                             AlgoritmoPlanificacion algoritmo, long semilla, int saMinutos,
                                             boolean detenerEnColapso, ComposicionFlota flota,
                                             ParametrosDominio parametros,
                                             List<VentanaMantenimiento> mantenimientos) {

    /**
     * Solicitud sin mantenimientos preventivos.
     *
     * @param pedidos          pedidos del horizonte
     * @param bloqueos         bloqueos programados
     * @param algoritmo        metaheuristica de cada ciclo
     * @param semilla          semilla base
     * @param saMinutos        salto del algoritmo Sa
     * @param detenerEnColapso verdadero para detenerse en el primer incumplimiento
     * @param flota            composicion de la flota
     * @param parametros       parametros del dominio de la ejecucion
     */
    public SolicitudPreparacionSimulacion(List<Pedido> pedidos, List<Bloqueo> bloqueos,
                                          AlgoritmoPlanificacion algoritmo, long semilla, int saMinutos,
                                          boolean detenerEnColapso, ComposicionFlota flota,
                                          ParametrosDominio parametros) {
        this(pedidos, bloqueos, algoritmo, semilla, saMinutos, detenerEnColapso, flota, parametros, List.of());
    }

    /**
     * Solicitud con los parametros del dominio por defecto y sin mantenimientos preventivos.
     *
     * @param pedidos          pedidos del horizonte
     * @param bloqueos         bloqueos programados
     * @param algoritmo        metaheuristica de cada ciclo
     * @param semilla          semilla base
     * @param saMinutos        salto del algoritmo Sa
     * @param detenerEnColapso verdadero para detenerse en el primer incumplimiento
     * @param flota            composicion de la flota
     */
    public SolicitudPreparacionSimulacion(List<Pedido> pedidos, List<Bloqueo> bloqueos,
                                          AlgoritmoPlanificacion algoritmo, long semilla, int saMinutos,
                                          boolean detenerEnColapso, ComposicionFlota flota) {
        this(pedidos, bloqueos, algoritmo, semilla, saMinutos, detenerEnColapso, flota,
                ParametrosDominio.porDefecto());
    }
}
