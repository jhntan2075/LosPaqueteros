package pe.pucp.paqtracker.modelo;

/**
 * Severidad de una averia (LE-incidencias). Determina cuanto tiempo la unidad
 * permanece en el lugar antes de recuperarse o de ser trasladada, y el tiempo
 * total de no disponibilidad.
 */
public enum TipoAveria {

    /** Menor (p. ej. llanta desinflada): 2 horas, se reincorpora en el lugar. */
    TIPO_1,

    /** Intermedia (p. ej. rotura de transmision): hasta el fin del siguiente turno. */
    TIPO_2,

    /** Mayor (mantenimiento): al menos 2 dias, se reincorpora en el turno 15:00-23:00. */
    TIPO_3
}
