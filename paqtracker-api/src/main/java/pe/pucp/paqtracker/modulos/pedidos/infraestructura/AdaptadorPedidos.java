package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoAvance;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidos;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;

/**
 * Implementa el puerto del modulo de ejecucion con los pedidos que guarda este modulo.
 */
@Component
public class AdaptadorPedidos implements PuertoPedidos {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdaptadorPedidos.class);

    private static final int MINUTOS_POR_HORA = 60;

    private final RepositorioPedido repositorio;

    /**
     * @param repositorio persistencia de pedidos
     */
    public AdaptadorPedidos(RepositorioPedido repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public Set<YearMonth> mesesDelSistema() {
        return repositorio.mesesDelLote(PedidoRegistrado.LOTE_SISTEMA);
    }

    @Override
    public Set<YearMonth> mesesDelLote(String lote) {
        return repositorio.mesesDelLote(lote);
    }

    @Override
    public List<PedidoFuente> delSistema(Instant desde, Instant hasta) {
        return delLote(PedidoRegistrado.LOTE_SISTEMA, desde, hasta);
    }

    @Override
    public List<PedidoFuente> delLote(String lote, Instant desde, Instant hasta) {
        return repositorio.listarDelLote(lote, desde, hasta).stream().map(AdaptadorPedidos::aFuente).toList();
    }

    @Override
    public List<PedidoFuente> manuales(Instant desde, Instant hasta) {
        return repositorio.listarManuales(desde, hasta).stream().map(AdaptadorPedidos::aFuente).toList();
    }

    @Override
    public void vincularLote(String lote, String ejecucionId) {
        repositorio.vincularLote(lote, ejecucionId);
    }

    /**
     * Lo llama el motor del dia a dia en cada paso. Si la base falla, se registra y la operacion sigue: el
     * avance en memoria es el que manda mientras la API corre, y cada avance lleva el estado completo del
     * pedido, asi que su siguiente cambio lo deja al dia.
     */
    @Override
    public void registrarAvance(List<AvancePedido> avances) {
        if (avances.isEmpty()) {
            return;
        }
        try {
            repositorio.registrarAvance(avances);
        } catch (DataAccessException excepcion) {
            LOGGER.error("No se pudo guardar el avance de {} pedidos", avances.size(), excepcion);
        }
    }

    private static PedidoFuente aFuente(PedidoRegistrado pedido) {
        return new PedidoFuente(Math.toIntExact(pedido.id()), pedido.x(), pedido.y(), pedido.cantidad(),
                pedido.plazoHoras() * MINUTOS_POR_HORA, pedido.registradoEn(), pedido.cliente(),
                pedido.estado() == null ? null : EstadoAvance.valueOf(pedido.estado()), pedido.cantidadEntregada());
    }
}
