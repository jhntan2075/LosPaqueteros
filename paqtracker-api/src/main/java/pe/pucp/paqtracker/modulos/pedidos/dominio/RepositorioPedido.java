package pe.pucp.paqtracker.modulos.pedidos.dominio;

import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;

/**
 * Puerto de persistencia de los pedidos.
 */
public interface RepositorioPedido {

    /**
     * @param pedido pedido manual sin id
     * @return el pedido con su id
     */
    PedidoRegistrado guardar(PedidoRegistrado pedido);

    /**
     * Guarda los pedidos de un archivo en lotes, sin devolverlos: un mes del curso tiene miles.
     *
     * @param pedidos pedidos sin id
     */
    void guardarTodos(List<PedidoRegistrado> pedidos);

    /**
     * @param id          pedido manual
     * @param registradoEn instante de registro definitivo
     * @param horaLimite  hora limite definitiva
     */
    void actualizarRegistro(long id, Instant registradoEn, Instant horaLimite);

    /**
     * @param id pedido manual que no llego a entrar a la operacion
     */
    void borrar(long id);

    /**
     * @param lote lote ({@link PedidoRegistrado#LOTE_SISTEMA} o el de una corrida)
     * @return meses que tiene el lote
     */
    Set<YearMonth> mesesDelLote(String lote);

    /**
     * @param lote  lote
     * @param desde inicio, incluido
     * @param hasta fin, excluido
     * @return pedidos del lote registrados en el intervalo, en orden de registro
     */
    List<PedidoRegistrado> listarDelLote(String lote, Instant desde, Instant hasta);

    /**
     * @param desde inicio, incluido
     * @param hasta fin, excluido
     * @return pedidos manuales registrados en el intervalo, en orden de registro
     */
    List<PedidoRegistrado> listarManuales(Instant desde, Instant hasta);

    /**
     * @param lote        lote de una corrida
     * @param ejecucionId ejecucion que lo usa
     * @return pedidos vinculados; 0 si el lote no existe o ya tenia ejecucion
     */
    int vincularLote(String lote, String ejecucionId);

    /**
     * @return pedidos borrados de lotes de corrida que nunca se usaron
     */
    int borrarLotesSinEjecucion();

    /**
     * @param avances avance de cada pedido en el dia a dia
     */
    void registrarAvance(List<AvancePedido> avances);
}
