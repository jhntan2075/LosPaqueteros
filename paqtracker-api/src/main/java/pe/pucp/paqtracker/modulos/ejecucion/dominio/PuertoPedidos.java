package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;

/**
 * Pedidos que la ejecucion lee de la base y avance que escribe en ella. Lo implementa el modulo de pedidos.
 */
public interface PuertoPedidos {

    /**
     * @return meses que tienen pedidos del sistema
     */
    Set<YearMonth> mesesDelSistema();

    /**
     * @param lote lote de una corrida
     * @return meses que trae el lote; vacio si no existe
     */
    Set<YearMonth> mesesDelLote(String lote);

    /**
     * @param desde inicio, incluido
     * @param hasta fin, excluido
     * @return pedidos del sistema registrados en el intervalo
     */
    List<PedidoFuente> delSistema(Instant desde, Instant hasta);

    /**
     * @param lote  lote de una corrida
     * @param desde inicio, incluido
     * @param hasta fin, excluido
     * @return pedidos del lote registrados en el intervalo
     */
    List<PedidoFuente> delLote(String lote, Instant desde, Instant hasta);

    /**
     * @param desde inicio, incluido
     * @param hasta fin, excluido
     * @return pedidos registrados a mano en el intervalo
     */
    List<PedidoFuente> manuales(Instant desde, Instant hasta);

    /**
     * @param lote        lote de una corrida
     * @param ejecucionId ejecucion que lo usa
     */
    void vincularLote(String lote, String ejecucionId);

    /**
     * @param avances cambios de avance del dia a dia
     */
    void registrarAvance(List<AvancePedido> avances);

    /**
     * Pedido tal como lo necesita la ejecucion.
     *
     * @param id                id en la base, que es tambien su id en el motor
     * @param x                 coordenada horizontal del destino
     * @param y                 coordenada vertical del destino
     * @param cantidad          paquetes
     * @param plazoMinutos      plazo de entrega
     * @param registradoEn      instante de registro
     * @param cliente           cliente, o null
     * @param estado            avance guardado en el dia a dia, o null si ninguna operacion lo atendio
     * @param cantidadEntregada paquetes ya entregados en el dia a dia
     */
    record PedidoFuente(int id, int x, int y, int cantidad, int plazoMinutos, Instant registradoEn, String cliente,
                        EstadoAvance estado, int cantidadEntregada) {

        /**
         * @return instante limite de entrega
         */
        public Instant horaLimite() {
            return registradoEn.plus(Duration.ofMinutes(plazoMinutos));
        }
    }
}
