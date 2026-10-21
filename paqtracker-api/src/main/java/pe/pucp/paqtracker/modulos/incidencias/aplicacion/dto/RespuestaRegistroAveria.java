package pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto;

/**
 * Averia registrada y encolada. Aun no se aplica: el motor la aplica en su siguiente salto Sc y lo
 * difunde con el evento {@code UNIDAD_AVERIADA}.
 *
 * @param id                identificador del registro
 * @param ejecucionId       ejecucion en que se registro
 * @param unidad            codigo visible de la unidad
 * @param tipo              severidad: 1, 2 o 3
 * @param estado            PROGRAMADA: encolada, a la espera del siguiente salto Sc
 * @param instanteMs        instante simulado de la averia, epoch en milisegundos
 * @param reincorporacionMs instante simulado estimado en que la unidad vuelve a operar
 * @param trasladoCentralMs instante simulado del traslado al almacen central, o null en tipo 1
 */
public record RespuestaRegistroAveria(Long id, String ejecucionId, String unidad, int tipo, String estado,
                                      long instanteMs, long reincorporacionMs, Long trasladoCentralMs) {
}
