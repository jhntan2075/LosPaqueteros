package pe.pucp.paqtracker.comun.excepcion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.List;

/**
 * Traduce las excepciones a respuestas HTTP con un cuerpo {@link RespuestaError} uniforme. Es el
 * borde del servicio: el unico lugar donde se captura {@link Exception}.
 */
@RestControllerAdvice
public class ManejadorErroresGlobal {

    private static final Logger LOGGER = LoggerFactory.getLogger(ManejadorErroresGlobal.class);

    /**
     * @param excepcion recurso inexistente
     * @return 404
     */
    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<RespuestaError> manejarNoEncontrado(RecursoNoEncontradoException excepcion) {
        return responder(HttpStatus.NOT_FOUND, excepcion.getMessage(), List.of());
    }

    /**
     * @param excepcion operacion invalida en el estado actual
     * @return 409
     */
    @ExceptionHandler(OperacionNoPermitidaException.class)
    public ResponseEntity<RespuestaError> manejarNoPermitida(OperacionNoPermitidaException excepcion) {
        return responder(HttpStatus.CONFLICT, excepcion.getMessage(), List.of());
    }

    /**
     * @param excepcion datos que violan reglas de negocio
     * @return 400
     */
    @ExceptionHandler(SolicitudInvalidaException.class)
    public ResponseEntity<RespuestaError> manejarSolicitudInvalida(SolicitudInvalidaException excepcion) {
        return responder(HttpStatus.BAD_REQUEST, excepcion.getMessage(), List.of());
    }

    /**
     * @param excepcion cuerpo que no pasa la validacion de Bean Validation
     * @return 400 con un detalle por campo
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<RespuestaError> manejarValidacion(MethodArgumentNotValidException excepcion) {
        List<String> detalles = excepcion.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return responder(HttpStatus.BAD_REQUEST, "La solicitud tiene campos invalidos", detalles);
    }

    /**
     * @param excepcion error no previsto
     * @return 500 sin exponer detalles internos
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<RespuestaError> manejarInesperado(Exception excepcion) {
        LOGGER.error("Error no controlado", excepcion);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor", List.of());
    }

    private ResponseEntity<RespuestaError> responder(HttpStatus estado, String mensaje, List<String> detalles) {
        RespuestaError cuerpo = new RespuestaError(estado.value(), estado.getReasonPhrase(), mensaje, detalles);
        return ResponseEntity.status(estado).body(cuerpo);
    }
}
