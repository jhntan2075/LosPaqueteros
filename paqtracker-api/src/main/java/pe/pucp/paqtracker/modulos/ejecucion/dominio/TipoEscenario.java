package pe.pucp.paqtracker.modulos.ejecucion.dominio;

/**
 * Escenarios de ejecucion del sistema. Pueden correr a la vez.
 */
public enum TipoEscenario {

    /** Operacion dia a dia con reloj real (CU-15). Hay una sola, siempre activa. */
    DIA_A_DIA,

    /** Simulacion de un periodo de dias con reloj acelerado (CU-16). */
    SIMULACION_PERIODO,

    /** Simulacion con reloj acelerado que se detiene en el primer incumplimiento (CU-17). */
    COLAPSO_LOGISTICO
}
