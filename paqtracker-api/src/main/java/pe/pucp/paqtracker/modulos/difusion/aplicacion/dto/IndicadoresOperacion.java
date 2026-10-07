package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

/**
 * KPI de la ejecucion para el panel y el semaforo global.
 *
 * @param pedidosRegistrados           pedidos ya registrados (ingresados al sistema)
 * @param pedidosEntregadosATiempo     entregados dentro de su hora limite
 * @param pedidosEntregadosConRetraso  entregados despues de su hora limite
 * @param pedidosPendientes            registrados y aun sin salir
 * @param pedidosEnTransito            despachados y aun no entregados
 * @param unidadesEnRuta               unidades en ruta
 * @param unidadesDisponibles          unidades libres en un almacen
 * @param unidadesAveriadas            unidades averiadas (aun no se modelan averias: siempre 0)
 * @param tiempoPromedioEntregaMinutos promedio entre registro y entrega de los entregados
 * @param tiempoComputoUltimoTaMs      Ta de la ultima planificacion
 * @param replanificaciones            planificaciones ejecutadas
 * @param distanciaTotalKm             kilometros recorridos por la flota
 * @param porcentajeCumplimiento       entregados a tiempo sobre entregados, en %; 100 si aun no hay (LE-086)
 * @param estadoSemaforoGlobal         VERDE, AMBAR o ROJO
 */
public record IndicadoresOperacion(int pedidosRegistrados, int pedidosEntregadosATiempo,
                                   int pedidosEntregadosConRetraso, int pedidosPendientes, int pedidosEnTransito,
                                   int unidadesEnRuta, int unidadesDisponibles, int unidadesAveriadas,
                                   double tiempoPromedioEntregaMinutos, long tiempoComputoUltimoTaMs,
                                   int replanificaciones, double distanciaTotalKm, double porcentajeCumplimiento,
                                   String estadoSemaforoGlobal) {
}
