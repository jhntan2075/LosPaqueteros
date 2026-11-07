package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import java.util.List;

/**
 * Ultima planificacion estable de una ejecucion: el plan vigente justo despues de la ultima planificacion que
 * termino sin declarar el colapso. Es una copia inmutable (memento): el reporte no depende de que la ejecucion
 * siga viva ni de lo que pase despues.
 *
 * @param ejecucionId         ejecucion
 * @param tipoEscenario       DIA_A_DIA, SIMULACION_PERIODO o COLAPSO_LOGISTICO
 * @param algoritmo           metaheuristica que produjo el plan
 * @param instanteMs          instante simulado de la planificacion, epoch en milisegundos
 * @param tiempoComputoMs     Ta de esa planificacion
 * @param unidadesDespachadas unidades que salieron con esa planificacion
 * @param rutas               rutas vigentes con entregas pendientes, una por unidad
 * @param pedidosSinAsignar   pedidos que quedaron en la cola, sin unidad
 * @param colapso             datos del colapso si la ejecucion colapso despues de este plan, o null
 */
public record PlanEstable(String ejecucionId, String tipoEscenario, String algoritmo, long instanteMs,
                          long tiempoComputoMs, int unidadesDespachadas, List<RutaPlanificada> rutas,
                          List<String> pedidosSinAsignar, ColapsoPlan colapso) {

    /**
     * @param colapso datos del colapso posterior al plan
     * @return el mismo plan, marcado como el ultimo estable antes del colapso
     */
    public PlanEstable conColapso(ColapsoPlan colapso) {
        return new PlanEstable(ejecucionId, tipoEscenario, algoritmo, instanteMs, tiempoComputoMs,
                unidadesDespachadas, rutas, pedidosSinAsignar, colapso);
    }

    /**
     * @param instanteMs instante simulado del colapso, epoch en milisegundos
     * @param pedido     pedido que lo causo
     * @param causa      causa reportada por el nucleo
     */
    public record ColapsoPlan(long instanteMs, String pedido, String causa) {
    }
}
