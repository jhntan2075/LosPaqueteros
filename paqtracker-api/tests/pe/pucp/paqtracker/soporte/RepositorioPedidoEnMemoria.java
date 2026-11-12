package pe.pucp.paqtracker.soporte;

import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Repositorio de pedidos en memoria para pruebas unitarias: guarda lo que recibe para verificarlo.
 */
public class RepositorioPedidoEnMemoria implements RepositorioPedido {

    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");

    private final List<PedidoRegistrado> pedidos = new ArrayList<>();
    private final List<AvancePedido> avances = new ArrayList<>();
    private long siguienteId = 1;

    /**
     * @return pedidos guardados, en orden
     */
    public List<PedidoRegistrado> getPedidos() {
        return pedidos;
    }

    /**
     * @return avances registrados, en orden
     */
    public List<AvancePedido> getAvances() {
        return avances;
    }

    @Override
    public PedidoRegistrado guardar(PedidoRegistrado pedido) {
        PedidoRegistrado conId = conId(pedido);
        pedidos.add(conId);
        return conId;
    }

    @Override
    public void guardarTodos(List<PedidoRegistrado> nuevos) {
        nuevos.forEach(this::guardar);
    }

    @Override
    public void actualizarRegistro(long id, Instant registradoEn, Instant horaLimite) {
        // Las pruebas que usan este repositorio no dependen del registro definitivo.
    }

    @Override
    public void borrar(long id) {
        pedidos.removeIf(pedido -> pedido.id() == id);
    }

    @Override
    public Set<YearMonth> mesesDelLote(String lote) {
        return pedidos.stream().filter(pedido -> Objects.equals(lote, pedido.lote()))
                .map(pedido -> YearMonth.parse(pedido.mesArchivo(), FORMATO_MES)).collect(Collectors.toSet());
    }

    @Override
    public List<PedidoRegistrado> listarDelLote(String lote, Instant desde, Instant hasta) {
        return pedidos.stream().filter(pedido -> Objects.equals(lote, pedido.lote()))
                .filter(pedido -> !pedido.registradoEn().isBefore(desde) && pedido.registradoEn().isBefore(hasta))
                .toList();
    }

    @Override
    public List<PedidoRegistrado> listarManuales(Instant desde, Instant hasta) {
        return pedidos.stream().filter(pedido -> pedido.lote() == null)
                .filter(pedido -> !pedido.registradoEn().isBefore(desde) && pedido.registradoEn().isBefore(hasta))
                .toList();
    }

    @Override
    public int vincularLote(String lote, String ejecucionId) {
        return 0;
    }

    @Override
    public int borrarLotesSinEjecucion() {
        return 0;
    }

    @Override
    public void registrarAvance(List<AvancePedido> nuevos) {
        avances.addAll(nuevos);
    }

    private PedidoRegistrado conId(PedidoRegistrado pedido) {
        return new PedidoRegistrado(siguienteId++, pedido.origen(), pedido.lote(), pedido.mesArchivo(),
                pedido.orden(), pedido.ejecucionId(), pedido.cliente(), pedido.x(), pedido.y(), pedido.cantidad(),
                pedido.plazoHoras(), pedido.registradoEn(), pedido.horaLimite(), pedido.estado(),
                pedido.cantidadEntregada());
    }
}
