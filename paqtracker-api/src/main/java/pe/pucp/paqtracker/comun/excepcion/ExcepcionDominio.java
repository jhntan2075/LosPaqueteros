package pe.pucp.paqtracker.comun.excepcion;

/**
 * Base de las excepciones de negocio de la API. El {@link ManejadorErroresGlobal} las traduce a
 * respuestas HTTP segun su tipo; los casos de uso no conocen HTTP.
 */
public abstract class ExcepcionDominio extends RuntimeException {

    /**
     * @param mensaje descripcion del problema, con el valor recibido
     */
    protected ExcepcionDominio(String mensaje) {
        super(mensaje);
    }

    /**
     * @param mensaje descripcion del problema
     * @param causa   excepcion de origen
     */
    protected ExcepcionDominio(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
