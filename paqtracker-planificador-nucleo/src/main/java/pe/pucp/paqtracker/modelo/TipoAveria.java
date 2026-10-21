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
    TIPO_3;

    /**
     * @return numero con que el operador identifica el tipo: 1, 2 o 3
     */
    public int getNumero() {
        return switch (this) {
            case TIPO_1 -> 1;
            case TIPO_2 -> 2;
            case TIPO_3 -> 3;
        };
    }

    /**
     * @param numero numero del tipo: 1, 2 o 3
     * @return el tipo con ese numero
     * @throws IllegalArgumentException si el numero no corresponde a ningun tipo
     */
    public static TipoAveria desdeNumero(int numero) {
        for (TipoAveria tipo : values()) {
            if (tipo.getNumero() == numero) {
                return tipo;
            }
        }
        throw new IllegalArgumentException("Tipo de averia invalido: " + numero + " (use 1, 2 o 3)");
    }
}
