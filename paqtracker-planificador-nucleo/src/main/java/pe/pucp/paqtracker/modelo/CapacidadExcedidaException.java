package pe.pucp.paqtracker.modelo;

/**
 * Excepcion del dominio que indica que una ruta supera la capacidad de su
 * unidad o el stock disponible de su almacen de origen.
 */
public class CapacidadExcedidaException extends RuntimeException {

    /**
     * @param mensaje descripcion de la condicion invalida
     */
    public CapacidadExcedidaException(String mensaje) {
        super(mensaje);
    }
}
