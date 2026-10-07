package pe.pucp.paqtracker.modulos.ejecucion.dominio;

/**
 * Ciclo de vida de una ejecucion.
 */
public enum EstadoEjecucion {

    /** Creada con sus datos cargados; el reloj aun no corre. */
    CONFIGURADA,

    /** El reloj corre y el motor avanza la simulacion. */
    EN_CURSO,

    /** El reloj esta detenido; se puede reanudar. */
    PAUSADA,

    /** Llego al final de su horizonte o fue detenida. */
    FINALIZADA,

    /** Se detuvo al declararse el colapso logistico. */
    COLAPSADA;

    /**
     * @return verdadero si la ejecucion ya no puede avanzar
     */
    public boolean esTerminal() {
        return this == FINALIZADA || this == COLAPSADA;
    }
}
