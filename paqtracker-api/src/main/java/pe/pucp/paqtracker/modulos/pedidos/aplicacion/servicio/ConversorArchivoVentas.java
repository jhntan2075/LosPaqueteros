package pe.pucp.paqtracker.modulos.pedidos.aplicacion.servicio;

import pe.pucp.paqtracker.lectura.CargadorPedidos;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.OrigenPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Convierte las lineas de un archivo de ventas de un mes en pedidos para guardar: el archivo trae el
 * registro como dia, hora y minuto del mes, y la base guarda el instante absoluto.
 */
public final class ConversorArchivoVentas {

    private static final int MINUTOS_POR_HORA = 60;
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");

    private ConversorArchivoVentas() {
    }

    /**
     * @param lineas lineas del archivo, ya validadas o del curso
     * @param mes    mes del archivo
     * @param zona   zona horaria de la operacion
     * @param origen origen de los pedidos
     * @param lote   lote al que pertenecen
     * @return un pedido por linea, en el orden del archivo
     * @throws IllegalArgumentException si alguna linea no respeta el formato
     */
    public static List<PedidoRegistrado> convertir(List<String> lineas, YearMonth mes, ZoneId zona,
                                                   OrigenPedido origen, String lote) {
        Instant inicioMes = mes.atDay(1).atStartOfDay(zona).toInstant();
        String clave = mes.format(FORMATO_MES);
        return CargadorPedidos.leer(lineas).stream()
                .map(pedido -> aRegistro(pedido, inicioMes, clave, origen, lote)).toList();
    }

    private static PedidoRegistrado aRegistro(Pedido pedido, Instant inicioMes, String mes, OrigenPedido origen,
                                              String lote) {
        Instant registro = inicioMes.plus(Duration.ofMinutes(pedido.getInstanteRegistro()));
        Instant limite = registro.plus(Duration.ofMinutes(pedido.getPlazo()));
        return new PedidoRegistrado(null, origen, lote, mes, pedido.getId(), null, pedido.getCliente(),
                pedido.getDestino().getX(), pedido.getDestino().getY(), pedido.getCantidad(),
                pedido.getPlazo() / MINUTOS_POR_HORA, registro, limite, null, 0);
    }
}
