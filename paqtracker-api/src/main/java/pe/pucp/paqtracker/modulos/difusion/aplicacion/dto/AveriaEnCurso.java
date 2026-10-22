package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

/**
 * Averia vigente de una unidad, para que quien abre la vista despues de {@code UNIDAD_AVERIADA} vea su tipo
 * y cuando vuelve a operar sin haber recibido el evento.
 *
 * @param tipo              severidad: 1, 2 o 3
 * @param desdeMs           instante simulado de la averia, epoch en milisegundos
 * @param reincorporacionMs instante simulado en que la unidad vuelve a operar
 * @param trasladoCentralMs instante simulado del traslado al almacen central, o null en tipo 1
 */
public record AveriaEnCurso(int tipo, long desdeMs, long reincorporacionMs, Long trasladoCentralMs) {
}
