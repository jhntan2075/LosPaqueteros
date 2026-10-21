package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

/**
 * Averia aceptada por el motor de una ejecucion y encolada en su agenda; se aplica en el siguiente salto
 * Sc.
 *
 * @param ejecucionId        ejecucion en que se registro
 * @param codigoUnidad       codigo visible de la unidad (A-01, M-03, B-12)
 * @param tipo               severidad: 1, 2 o 3
 * @param instanteMs         instante simulado de la averia, epoch en milisegundos
 * @param reincorporacionMs  instante simulado estimado en que la unidad vuelve a operar
 * @param trasladoCentralMs  instante simulado del traslado al almacen central, o null en tipo 1
 */
public record AveriaProgramada(String ejecucionId, String codigoUnidad, int tipo, long instanteMs,
                               long reincorporacionMs, Long trasladoCentralMs) {
}
