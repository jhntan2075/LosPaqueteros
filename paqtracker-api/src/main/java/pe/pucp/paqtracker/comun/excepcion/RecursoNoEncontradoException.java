package pe.pucp.paqtracker.comun.excepcion;

/**
 * Se busco un recurso (ejecucion, pedido) que no existe. Se responde con 404.
 */
public class RecursoNoEncontradoException extends ExcepcionDominio {

    /**
     * @param recurso tipo de recurso buscado
     * @param id      identificador recibido
     */
    public RecursoNoEncontradoException(String recurso, Object id) {
        super("No existe " + recurso + " con id " + id);
    }
}
