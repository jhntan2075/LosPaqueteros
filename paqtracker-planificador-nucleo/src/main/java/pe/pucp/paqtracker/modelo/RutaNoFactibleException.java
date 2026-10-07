package pe.pucp.paqtracker.modelo;

/**
 * Excepcion del dominio que indica que una ruta no puede completarse, por
 * ejemplo porque su almacen de destino no tiene stock proyectado al llegar.
 */
public class RutaNoFactibleException extends RuntimeException {

    /**
     * @param mensaje descripcion de la condicion invalida
     */
    public RutaNoFactibleException(String mensaje) {
        super(mensaje);
    }
}
