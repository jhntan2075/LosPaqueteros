package pe.pucp.paqtracker.modulos.ejecucion.dominio;

/**
 * Avance de un pedido en el dia a dia, tal como se guarda para retomarlo tras un reinicio.
 */
public enum EstadoAvance {

    /** Entro a la cola de la operacion y espera despacho. */
    REGISTRADO,

    /** Al menos una parte va en camino. */
    EN_TRANSITO,

    /** Se entrego su ultima parte, a tiempo o tarde. */
    ENTREGADO,

    /** Su hora limite vencio mientras la API estaba detenida, sin entregarse. */
    INCUMPLIDO
}
