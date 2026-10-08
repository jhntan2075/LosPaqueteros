package pe.pucp.paqtracker.comun.excepcion;

import java.util.List;

/**
 * Cuerpo de toda respuesta de error de la API.
 *
 * @param estado   codigo HTTP
 * @param error    descripcion corta del tipo de error
 * @param mensaje  detalle legible del problema
 * @param detalles errores puntuales (campos invalidos), vacio si no aplica
 */
public record RespuestaError(int estado, String error, String mensaje, List<String> detalles) {
}
