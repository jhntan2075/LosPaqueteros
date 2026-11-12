package pe.pucp.paqtracker.modulos.pedidos.dominio;

/**
 * De donde salio un pedido guardado.
 */
public enum OrigenPedido {

    /** Archivo de ventas del curso, cargado una vez al arrancar la API. Lo usan el dia a dia y las simulaciones. */
    ARCHIVO_SISTEMA,

    /** Registrado por el operador durante el dia a dia (CU-01). */
    MANUAL,

    /** Archivo subido para una sola simulacion: no reemplaza a los del sistema (CU-02). */
    ARCHIVO_CORRIDA
}
