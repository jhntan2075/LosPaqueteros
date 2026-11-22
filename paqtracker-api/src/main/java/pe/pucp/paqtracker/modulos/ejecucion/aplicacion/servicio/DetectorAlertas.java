package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AlmacenEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.PedidoEnMapa;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Detecta las alertas que se derivan de la instantanea que el motor acaba de difundir: un almacen intermedio que
 * entra en nivel rojo de inventario (STOCK_BAJO) y un pedido cuya llegada estimada supera su hora limite
 * (PEDIDO_TARDE). Usa los mismos niveles y estimaciones que ve el visualizador, de modo que la bitacora no
 * discrepa del mapa. Guarda lo ya avisado para no repetir; se usa solo desde el hilo del motor.
 */
final class DetectorAlertas {

    private static final long MILISEGUNDOS_POR_MINUTO = 60_000L;
    private static final int MINUTOS_POR_HORA = 60;
    private static final int PORCENTAJE_TOTAL = 100;

    private final Set<Integer> almacenesEnRojo = new HashSet<>();
    private final Set<String> pedidosAvisados = new HashSet<>();

    /**
     * Compara el nivel de inventario de cada almacen con el de la instantanea anterior. Un almacen que sale de
     * rojo se vuelve a armar: si entra otra vez, avisa de nuevo.
     *
     * @param almacenes almacenes de la instantanea
     * @return los almacenes que acaban de entrar en rojo; no incluye al ilimitado, que no tiene nivel
     */
    List<AlmacenEnMapa> almacenesQueEntranEnRojo(List<AlmacenEnMapa> almacenes) {
        List<AlmacenEnMapa> nuevos = new ArrayList<>();
        for (AlmacenEnMapa almacen : almacenes) {
            if (RangosSemaforo.NIVEL_ROJO.equals(almacen.nivelInventario())) {
                if (almacenesEnRojo.add(almacen.id())) {
                    nuevos.add(almacen);
                }
            } else {
                almacenesEnRojo.remove(almacen.id());
            }
        }
        return nuevos;
    }

    /**
     * Pedidos en transito cuya llegada estimada es posterior a su hora limite (holgura negativa) y que aun no se
     * avisaron. Cada pedido se avisa una sola vez, aunque despues su estimacion cambie.
     *
     * @param pedidos pedidos aun no entregados de la instantanea
     * @return los pedidos que acaban de pasar a llegar tarde
     */
    List<PedidoEnMapa> pedidosQueLlegaranTarde(List<PedidoEnMapa> pedidos) {
        List<PedidoEnMapa> nuevos = new ArrayList<>();
        for (PedidoEnMapa pedido : pedidos) {
            if ("EN_TRANSITO".equals(pedido.estado()) && pedido.etaMs() != null
                    && pedido.etaMs() > pedido.horaLimiteMs() && pedidosAvisados.add(pedido.codigo())) {
                nuevos.add(pedido);
            }
        }
        return nuevos;
    }

    /**
     * @param pedido pedido con llegada estimada
     * @return minutos que la llegada estimada excede la hora limite
     */
    static int minutosTarde(PedidoEnMapa pedido) {
        return (int) ((pedido.etaMs() - pedido.horaLimiteMs()) / MILISEGUNDOS_POR_MINUTO);
    }

    /**
     * @param minutos duracion en minutos
     * @return texto legible: "38 min" o "1 h 07 min"
     */
    static String formatearDuracion(long minutos) {
        if (minutos < MINUTOS_POR_HORA) {
            return minutos + " min";
        }
        return String.format("%d h %02d min", minutos / MINUTOS_POR_HORA, minutos % MINUTOS_POR_HORA);
    }

    /**
     * @param almacen almacen con capacidad limitada
     * @return stock disponible como porcentaje entero de su capacidad
     */
    static int porcentajeStock(AlmacenEnMapa almacen) {
        return (int) Math.round((double) PORCENTAJE_TOTAL * almacen.stockActual() / almacen.capacidadMaxima());
    }
}
