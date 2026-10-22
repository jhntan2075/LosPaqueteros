package pe.pucp.paqtracker.modelo;

/**
 * Naturaleza de un tramo del recorrido de una unidad.
 */
public enum TipoTramo {

    /** Desplazamiento desde el punto actual hasta el destino de una entrega. */
    VIAJE_A_ENTREGA,

    /** Acondicionamiento en el destino de una entrega: la unidad no se mueve. */
    SERVICIO,

    /** Desplazamiento desde la ultima entrega hasta el almacen de destino. */
    RETORNO,

    /** Detencion por una averia tipo 1: la unidad queda inmovilizada en el punto con su carga. */
    AVERIA,

    /** Desvio de una unidad en ruta hasta una unidad averiada, para recoger parte de su carga. */
    VIAJE_A_TRASBORDO,

    /** Trasvase de la carga de una unidad averiada a la receptora: la receptora no se mueve. */
    TRASVASE
}
