package pe.pucp.paqtracker.modelo;

/**
 * Estado operativo de una unidad de la flota en un instante dado.
 *
 * {@code EN_ENTREGA} y {@code FUERA_DE_TURNO} aun no tienen logica que los
 * produzca: quedan declarados para distinguir el instante de servicio dentro de
 * una ruta y el turno de la unidad, que se abordan por separado. {@code AVERIADA}
 * lo asigna el orquestador al aplicar una averia.
 */
public enum EstadoVehiculo {

    /** Libre en un almacen, disponible para que el planificador la use. */
    DISPONIBLE_EN_ALMACEN,

    /** Desplazandose entre paradas de una ruta asignada. */
    EN_RUTA,

    /** Atendiendo el tiempo de acondicionamiento de una entrega. */
    EN_ENTREGA,

    /** En su hora de refrigerio; no disponible para planificar. */
    EN_REFRIGERIO,

    /** Fuera de su turno de trabajo. */
    FUERA_DE_TURNO,

    /** Averiada; inmovilizada en su posicion hasta reincorporarse. */
    AVERIADA
}
