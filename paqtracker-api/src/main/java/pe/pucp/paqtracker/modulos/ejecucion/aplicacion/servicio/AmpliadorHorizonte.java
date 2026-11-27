package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.modelo.Pedido;
import java.util.List;
import java.util.Optional;

/**
 * Extiende el horizonte de una ejecucion que no lo tiene fijo (simulacion hasta el colapso): carga el tramo
 * siguiente de datos en la simulacion y devuelve el horizonte nuevo y los pedidos agregados, para que el
 * motor los siga.
 */
@FunctionalInterface
public interface AmpliadorHorizonte {

    /**
     * @param horizonteActual minuto en que hoy termina la ejecucion
     * @return el horizonte nuevo y los pedidos agregados, o vacio si ya no hay mas datos
     */
    Optional<Ampliacion> ampliar(int horizonteActual);

    /**
     * @param horizonte minuto en que termina ahora la ejecucion; mayor que el anterior
     * @param pedidos   pedidos agregados a la simulacion
     */
    record Ampliacion(int horizonte, List<Pedido> pedidos) {
    }
}
