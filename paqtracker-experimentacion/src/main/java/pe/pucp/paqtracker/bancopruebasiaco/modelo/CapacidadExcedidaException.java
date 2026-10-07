package pe.pucp.paqtracker.bancopruebasiaco.modelo;

/**
 * Se lanza cuando se intenta cargar en una unidad más paquetes de los que admite
 * (LE-020/021/022) o cuando un almacén intermedio no tiene stock para la carga pedida.
 */
public class CapacidadExcedidaException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final int capacidad;
    private final int solicitado;

    public CapacidadExcedidaException(String mensaje, int capacidad, int solicitado) {
        super(mensaje + " (capacidad " + capacidad + ", solicitado " + solicitado + ")");
        this.capacidad = capacidad;
        this.solicitado = solicitado;
    }

    public int capacidad() {
        return capacidad;
    }

    public int solicitado() {
        return solicitado;
    }
}
