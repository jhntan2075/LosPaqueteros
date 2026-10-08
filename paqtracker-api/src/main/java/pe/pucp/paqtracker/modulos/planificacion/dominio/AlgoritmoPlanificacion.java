package pe.pucp.paqtracker.modulos.planificacion.dominio;

import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import java.util.Locale;

/**
 * Metaheuristica con la que se planifica cada ciclo de una ejecucion.
 */
public enum AlgoritmoPlanificacion {

    /** Algoritmo genetico memetico (por defecto). */
    GA,

    /** Colonia de hormigas mejorada, adaptada a los bloques comunes. */
    IACO;

    /**
     * Interpreta el nombre del algoritmo sin distinguir mayusculas.
     *
     * @param nombre nombre recibido, p. ej. "ga" o "IACO"
     * @return algoritmo correspondiente
     * @throws SolicitudInvalidaException si el nombre no corresponde a ningun algoritmo
     */
    public static AlgoritmoPlanificacion desde(String nombre) {
        if (nombre == null) {
            throw new SolicitudInvalidaException("El algoritmo es obligatorio: GA o IACO");
        }
        try {
            return valueOf(nombre.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException excepcion) {
            throw new SolicitudInvalidaException("Algoritmo desconocido: " + nombre + " (use GA o IACO)", excepcion);
        }
    }
}
