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
    RETORNO
}
