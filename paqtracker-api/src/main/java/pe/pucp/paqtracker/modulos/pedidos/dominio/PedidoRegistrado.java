package pe.pucp.paqtracker.modulos.pedidos.dominio;

import java.time.Instant;

/**
 * Pedido guardado en la base: del archivo del sistema, de un archivo subido para una corrida o registrado a
 * mano. El nucleo solo conoce destino, cantidad y plazo; aqui ademas queda su origen, su cliente y, en el dia
 * a dia, su avance.
 *
 * @param id                identificador en la base (tambien su identificador en el motor), o null si aun no se
 *                          guarda
 * @param origen            de donde salio
 * @param lote              {@link #LOTE_SISTEMA} para los del sistema, el lote de la corrida, o null si es manual
 * @param mesArchivo        mes del archivo (YYYYMM), o null si es manual
 * @param orden             posicion en el archivo, o null si es manual
 * @param ejecucionId       ejecucion a la que pertenece (manuales y archivos de corrida), o null
 * @param cliente           cliente que lo solicita, o null si el archivo no lo trae
 * @param x                 coordenada horizontal del destino
 * @param y                 coordenada vertical del destino
 * @param cantidad          paquetes
 * @param plazoHoras        plazo de entrega
 * @param registradoEn      instante de registro
 * @param horaLimite        instante limite de entrega
 * @param estado            avance en el dia a dia (REGISTRADO, EN_TRANSITO, ENTREGADO, INCUMPLIDO), o null si
 *                          ninguna operacion lo atendio
 * @param cantidadEntregada paquetes ya entregados en el dia a dia
 */
public record PedidoRegistrado(Long id, OrigenPedido origen, String lote, String mesArchivo, Integer orden,
                               String ejecucionId, String cliente, int x, int y, int cantidad, int plazoHoras,
                               Instant registradoEn, Instant horaLimite, String estado, int cantidadEntregada) {

    /** Lote de los pedidos que vienen de los archivos del sistema. */
    public static final String LOTE_SISTEMA = "SISTEMA";
}
