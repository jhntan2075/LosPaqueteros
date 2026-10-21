package pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Cuerpo de {@code POST /api/ejecuciones/{id}/averias}.
 *
 * @param unidad codigo visible de la unidad (A-01, M-03, B-12)
 * @param tipo   severidad de la averia: 1, 2 o 3
 */
public record SolicitudRegistroAveria(@NotBlank String unidad, @NotNull Integer tipo) {
}
