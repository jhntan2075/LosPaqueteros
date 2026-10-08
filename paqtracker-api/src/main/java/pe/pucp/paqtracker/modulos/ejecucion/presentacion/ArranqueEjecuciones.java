package pe.pucp.paqtracker.modulos.ejecucion.presentacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoEjecutarDiaADia;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;

/**
 * Al terminar de iniciar la API: cierra las ejecuciones que la instancia anterior dejo sin terminar y
 * arranca la operacion dia a dia si esta habilitada. Es la puerta de entrada de CU-15: no la dispara
 * un usuario sino el arranque del sistema.
 */
@Component
public class ArranqueEjecuciones {

    private static final Logger LOGGER = LoggerFactory.getLogger(ArranqueEjecuciones.class);

    private final ServicioEjecucion servicioEjecucion;
    private final CasoUsoEjecutarDiaADia casoUsoDiaADia;
    private final boolean diaADiaActivo;

    /**
     * @param servicioEjecucion fachada de ejecucion
     * @param casoUsoDiaADia    CU-15
     * @param propiedades       parametros de la operacion
     */
    public ArranqueEjecuciones(ServicioEjecucion servicioEjecucion, CasoUsoEjecutarDiaADia casoUsoDiaADia,
                               PropiedadesDominio propiedades) {
        this.servicioEjecucion = servicioEjecucion;
        this.casoUsoDiaADia = casoUsoDiaADia;
        this.diaADiaActivo = propiedades.ejecucion().diaADiaActivo();
    }

    /**
     * Si arrancar el dia a dia falla (p. ej. faltan los datos del mes), la API sigue en pie para las
     * simulaciones y el error queda registrado.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void arrancar() {
        int cerradas = servicioEjecucion.cerrarInterrumpidas();
        if (cerradas > 0) {
            LOGGER.info("Se cerraron {} ejecuciones interrumpidas por el reinicio", cerradas);
        }
        if (!diaADiaActivo) {
            LOGGER.info("Operacion dia a dia deshabilitada por configuracion");
            return;
        }
        try {
            RespuestaEjecucion ejecucion = casoUsoDiaADia.ejecutar();
            LOGGER.info("Operacion dia a dia en curso: {}", ejecucion.relojSimulado());
        } catch (RuntimeException excepcion) {
            LOGGER.error("No se pudo arrancar la operacion dia a dia", excepcion);
        }
    }
}
