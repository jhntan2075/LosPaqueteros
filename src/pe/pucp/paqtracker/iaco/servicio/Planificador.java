package pe.pucp.paqtracker.iaco.servicio;

import pe.pucp.paqtracker.iaco.modelo.Ruta;

import java.util.List;

/**
 * Motor de planificación invocado por el simulador en cada ciclo de 30 minutos.
 *
 * <p>Devuelve las rutas candidatas; el simulador aplica después la puerta de
 * consolidación, el control de stock y la validación de fin de turno, de modo que
 * una ruta propuesta puede no despacharse.</p>
 */
public interface Planificador {

    String nombre();

    List<Ruta> planificar(ContextoPlanificacion contexto);

    /** Se invoca al inicio de cada corrida para limpiar memoria entre ciclos. */
    default void reiniciar() {
    }

    /** Libera recursos (por ejemplo, el pool de hilos de la colonia paralela). */
    default void cerrar() {
    }
}
