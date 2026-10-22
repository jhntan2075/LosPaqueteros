package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

/**
 * Lo que pasaria si se registrara ahora una averia de cierto tipo, sin registrarla: con esto el operador
 * ve cuando volveria a operar la unidad antes de elegir el tipo.
 *
 * @param tipo              severidad: 1, 2 o 3
 * @param instanteMs        instante simulado en que se aplicaria, epoch en milisegundos
 * @param reincorporacionMs instante simulado en que la unidad volveria a operar
 * @param trasladoCentralMs instante simulado del traslado al almacen central, o null en tipo 1
 */
public record EstimacionAveria(int tipo, long instanteMs, long reincorporacionMs, Long trasladoCentralMs) {
}
