package pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto;

import pe.pucp.paqtracker.modelo.TipoVehiculo;

/**
 * Mantenimiento preventivo de una unidad en la linea de tiempo de la ejecucion: la unidad numero
 * {@code correlativo} de su tipo (A-01 es el auto 1) no se planifica en {@code [inicio, fin)}.
 *
 * @param tipo        tipo de la unidad
 * @param correlativo numero de la unidad dentro de su tipo, desde 1
 * @param inicio      primer minuto en el taller
 * @param fin         primer minuto en que vuelve a estar disponible
 */
public record VentanaMantenimiento(TipoVehiculo tipo, int correlativo, int inicio, int fin) {
}
