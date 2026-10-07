package pe.pucp.paqtracker.modulos.ejecucion.dominio;

/**
 * Estado de un pedido dentro de una ejecucion, segun lo que el motor observa en cada paso.
 */
public enum EstadoPedido {

    /** Ingreso al sistema y espera ser despachado. */
    REGISTRADO,

    /** Va en una unidad que aun no llega a su destino. */
    EN_TRANSITO,

    /** Todas sus partes llegaron a destino. */
    ENTREGADO
}
