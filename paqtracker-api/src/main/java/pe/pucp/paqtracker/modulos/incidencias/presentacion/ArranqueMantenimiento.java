package pe.pucp.paqtracker.modulos.incidencias.presentacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.servicio.CargaMantenimientoSistema;

/**
 * Al terminar de iniciar la API, antes de que arranque el dia a dia: iguala la tabla de mantenimiento
 * preventivo al archivo configurado.
 */
@Component
public class ArranqueMantenimiento {

    /** Corre con la carga de pedidos, antes que el arranque de las ejecuciones, que lee este plan. */
    public static final int ORDEN = Ordered.HIGHEST_PRECEDENCE;

    private static final Logger LOGGER = LoggerFactory.getLogger(ArranqueMantenimiento.class);

    private final CargaMantenimientoSistema carga;

    /**
     * @param carga carga del plan de mantenimiento del sistema
     */
    public ArranqueMantenimiento(CargaMantenimientoSistema carga) {
        this.carga = carga;
    }

    /**
     * Carga el plan de mantenimiento preventivo. Un archivo ilegible se informa y no impide que la API
     * arranque: las ejecuciones usan el plan que ya estaba en la base.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Order(ORDEN)
    public void arrancar() {
        try {
            carga.sincronizar();
        } catch (RuntimeException excepcion) {
            LOGGER.error("No se pudo cargar el plan de mantenimiento preventivo", excepcion);
        }
    }
}
