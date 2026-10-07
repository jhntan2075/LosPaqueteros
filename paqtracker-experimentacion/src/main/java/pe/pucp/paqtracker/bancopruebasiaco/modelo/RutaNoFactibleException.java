package pe.pucp.paqtracker.bancopruebasiaco.modelo;

/**
 * Se lanza cuando una ruta ya evaluada viola una restricción dura del despacho:
 * no regresa a un almacén antes del cambio de turno (LE-023) o incluye un tramo
 * que ningún recorrido puede resolver por bloqueos (LE-036).
 */
public class RutaNoFactibleException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String motivo;

    public RutaNoFactibleException(String motivo) {
        super(motivo);
        this.motivo = motivo;
    }

    public String motivo() {
        return motivo;
    }
}
