package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.OrigenPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Calendar;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.TimeZone;
import java.util.stream.Collectors;

/**
 * Adaptador del puerto {@link RepositorioPedido}: JPA para leer y para los manuales, JDBC por lotes para los
 * pedidos de archivo y el avance, que son miles de filas. Las entidades no salen de esta capa.
 */
@Repository
public class RepositorioPedidoJpa implements RepositorioPedido {

    /** Filas por sentencia de un lote JDBC. */
    private static final int TAMANO_LOTE = 1000;
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");
    private static final String INSERTAR = "INSERT INTO pedido (origen, lote, mes_archivo, orden, ejecucion_id, "
            + "cliente, destino_x, destino_y, cantidad, plazo_horas, registrado_en, hora_limite, cantidad_entregada) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)";
    private static final String ACTUALIZAR_AVANCE = "UPDATE pedido SET estado = ?, cantidad_entregada = ?, "
            + "entregado_en = ?, retraso_minutos = ? WHERE id = ?";

    private final RepositorioPedidoSpringData springData;
    private final JdbcTemplate jdbc;

    /**
     * @param springData repositorio Spring Data
     * @param jdbc       acceso JDBC para las escrituras por lotes
     */
    public RepositorioPedidoJpa(RepositorioPedidoSpringData springData, JdbcTemplate jdbc) {
        this.springData = springData;
        this.jdbc = jdbc;
    }

    @Override
    public PedidoRegistrado guardar(PedidoRegistrado pedido) {
        EntidadPedido guardada = springData.save(new EntidadPedido(pedido.ejecucionId(), pedido.cliente(),
                pedido.x(), pedido.y(), pedido.cantidad(), pedido.plazoHoras(), aUtc(pedido.registradoEn()),
                aUtc(pedido.horaLimite())));
        return aDominio(guardada);
    }

    @Override
    @Transactional
    public void guardarTodos(List<PedidoRegistrado> pedidos) {
        jdbc.batchUpdate(INSERTAR, pedidos, TAMANO_LOTE, (sentencia, pedido) -> {
            sentencia.setString(1, pedido.origen().name());
            sentencia.setString(2, pedido.lote());
            sentencia.setString(3, pedido.mesArchivo());
            sentencia.setObject(4, pedido.orden());
            sentencia.setString(5, pedido.ejecucionId());
            sentencia.setString(6, pedido.cliente());
            sentencia.setInt(7, pedido.x());
            sentencia.setInt(8, pedido.y());
            sentencia.setInt(9, pedido.cantidad());
            sentencia.setInt(10, pedido.plazoHoras());
            fijarFecha(sentencia, 11, pedido.registradoEn());
            fijarFecha(sentencia, 12, pedido.horaLimite());
        });
    }

    @Override
    public void actualizarRegistro(long id, Instant registradoEn, Instant horaLimite) {
        springData.actualizarRegistro(id, aUtc(registradoEn), aUtc(horaLimite));
    }

    @Override
    public void borrar(long id) {
        springData.deleteById(id);
    }

    @Override
    public Set<YearMonth> mesesDelLote(String lote) {
        return springData.buscarMesesDelLote(lote).stream().filter(Objects::nonNull)
                .map(mes -> YearMonth.parse(mes, FORMATO_MES)).collect(Collectors.toSet());
    }

    @Override
    public List<PedidoRegistrado> listarDelLote(String lote, Instant desde, Instant hasta) {
        return springData.buscarDelLote(lote, aUtc(desde), aUtc(hasta)).stream()
                .map(RepositorioPedidoJpa::aDominio).toList();
    }

    @Override
    public List<PedidoRegistrado> listarManuales(Instant desde, Instant hasta) {
        return springData.buscarPorOrigen(OrigenPedido.MANUAL.name(), aUtc(desde), aUtc(hasta)).stream()
                .map(RepositorioPedidoJpa::aDominio).toList();
    }

    @Override
    public int vincularLote(String lote, String ejecucionId) {
        return springData.vincularLote(lote, ejecucionId);
    }

    @Override
    public int borrarLotesSinEjecucion() {
        return springData.borrarLotesSinEjecucion();
    }

    @Override
    @Transactional
    public void registrarAvance(List<AvancePedido> avances) {
        jdbc.batchUpdate(ACTUALIZAR_AVANCE, avances, TAMANO_LOTE, (sentencia, avance) -> {
            sentencia.setString(1, avance.estado().name());
            sentencia.setInt(2, avance.cantidadEntregada());
            fijarFecha(sentencia, 3, avance.entregadoEn());
            sentencia.setObject(4, avance.retrasoMinutos());
            sentencia.setLong(5, avance.idPedido());
        });
    }

    /**
     * Escribe un instante igual que Hibernate con {@code hibernate.jdbc.time_zone: UTC}: la fecha y hora UTC como
     * {@link Timestamp} y un calendario UTC. Asi las filas insertadas por JDBC y las leidas por JPA coinciden en
     * cualquier zona horaria de la JVM.
     */
    private static void fijarFecha(PreparedStatement sentencia, int indice, Instant instante) throws SQLException {
        if (instante == null) {
            sentencia.setNull(indice, Types.TIMESTAMP);
            return;
        }
        sentencia.setTimestamp(indice, Timestamp.valueOf(aUtc(instante)),
                Calendar.getInstance(TimeZone.getTimeZone(ZoneOffset.UTC)));
    }

    private static PedidoRegistrado aDominio(EntidadPedido entidad) {
        return new PedidoRegistrado(entidad.getId(), OrigenPedido.valueOf(entidad.getOrigen()), entidad.getLote(),
                entidad.getMesArchivo(), entidad.getOrden(), entidad.getEjecucionId(), entidad.getCliente(),
                entidad.getDestinoX(), entidad.getDestinoY(), entidad.getCantidad(), entidad.getPlazoHoras(),
                aInstante(entidad.getRegistradoEn()), aInstante(entidad.getHoraLimite()), entidad.getEstado(),
                entidad.getCantidadEntregada());
    }

    private static LocalDateTime aUtc(Instant instante) {
        return instante == null ? null : LocalDateTime.ofInstant(instante, ZoneOffset.UTC);
    }

    private static Instant aInstante(LocalDateTime fecha) {
        return fecha == null ? null : fecha.toInstant(ZoneOffset.UTC);
    }
}
