package pe.pucp.paqtracker.comun.excepcion;

/**
 * La operacion no es valida en el estado actual del recurso (p. ej. pausar una ejecucion ya
 * finalizada). Se responde con 409.
 */
public class OperacionNoPermitidaException extends ExcepcionDominio {

    /**
     * @param mensaje descripcion del problema, con el estado actual
     */
    public OperacionNoPermitidaException(String mensaje) {
        super(mensaje);
    }
}
