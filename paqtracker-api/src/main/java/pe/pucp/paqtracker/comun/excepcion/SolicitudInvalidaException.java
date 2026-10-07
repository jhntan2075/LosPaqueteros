package pe.pucp.paqtracker.comun.excepcion;

/**
 * Los datos recibidos no cumplen las reglas de negocio. Se responde con 400.
 */
public class SolicitudInvalidaException extends ExcepcionDominio {

    /**
     * @param mensaje descripcion del problema, con el valor recibido
     */
    public SolicitudInvalidaException(String mensaje) {
        super(mensaje);
    }

    /**
     * @param mensaje descripcion del problema
     * @param causa   excepcion de origen
     */
    public SolicitudInvalidaException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
