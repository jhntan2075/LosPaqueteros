package pe.pucp.paqtracker.planificador;

import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.SolucionRuteo;

/**
 * Contrato comun de los algoritmos metaheuristicos del planificador. Permite
 * que el servicio de despacho invoque cualquier algoritmo (GA, IACO u otro) de
 * forma intercambiable, para comparar estrategias sobre el mismo escenario.
 */
public interface AlgoritmoMetaheuristico {

    /**
     * Planifica las rutas para un escenario operativo.
     *
     * @param escenario escenario con pedidos, flota y bloqueos vigentes
     * @return mejor solucion de ruteo encontrada
     */
    SolucionRuteo planificar(EscenarioOperativo escenario);
}
