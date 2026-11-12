package pe.pucp.paqtracker.modulos.pedidos.presentacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.servicio.CargaPedidosSistema;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;

/**
 * Al terminar de iniciar la API, antes de que arranque el dia a dia: carga en la base los meses de ventas del
 * sistema que aun no tiene y borra los lotes subidos para simulaciones que nunca se crearon.
 */
@Component
public class ArranquePedidos {

    /** Corre antes que el arranque de las ejecuciones, que lee estos pedidos. */
    public static final int ORDEN = Ordered.HIGHEST_PRECEDENCE;

    private static final Logger LOGGER = LoggerFactory.getLogger(ArranquePedidos.class);

    private final CargaPedidosSistema carga;
    private final RepositorioPedido repositorio;

    /**
     * @param carga       carga de los archivos de ventas del sistema
     * @param repositorio persistencia de pedidos
     */
    public ArranquePedidos(CargaPedidosSistema carga, RepositorioPedido repositorio) {
        this.carga = carga;
        this.repositorio = repositorio;
    }

    /**
     * Carga los pedidos del sistema y limpia los lotes huerfanos.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Order(ORDEN)
    public void arrancar() {
        carga.cargarFaltantes();
        int huerfanos = repositorio.borrarLotesSinEjecucion();
        if (huerfanos > 0) {
            LOGGER.info("Se borraron {} pedidos de archivos subidos que ninguna simulacion uso", huerfanos);
        }
    }
}
