package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

/**
 * Parte de un pedido que lleva una sola unidad. Un pedido sin fraccionar tiene una sola fraccion; uno grande
 * puede repartirse en varias unidades, y una averia puede liberar una fraccion (vuelve a la cola) o pasarla a
 * otra unidad (trasvase). Es el "producto" de la rubrica: los paquetes del producto P no tienen identidad.
 *
 * @param indice        correlativo de la fraccion dentro del pedido, desde 1 (codigo visible P-00042·2)
 * @param unidad        codigo de la unidad que la lleva
 * @param almacenOrigen almacen del que salio: CENTRAL, INTERMEDIO_1 o INTERMEDIO_2
 * @param cantidad      paquetes
 * @param salidaMs      salida de la unidad desde el almacen, epoch en milisegundos simulados; puede ser futura
 *                      si la ruta ya se despacho pero la unidad aun no sale
 * @param llegadaMs     llegada al destino: estimada, o real si ya se entrego
 * @param estado        PROGRAMADA (aun no sale), EN_CAMINO, ENTREGADA o LIBERADA (devuelta a la cola por una
 *                      averia)
 */
public record FraccionEnvio(int indice, String unidad, String almacenOrigen, int cantidad, long salidaMs,
                            long llegadaMs, String estado) {
}
