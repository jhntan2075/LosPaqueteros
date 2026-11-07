package pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Cuerpo de {@code POST /api/ejecuciones/{id}/averias}.
 *
 * @param unidad codigo visible de la unidad (A-01, M-03, B-12)
 * @param tipo       severidad de la averia: 1, 2 o 3
 * @param instanteMs instante simulado (epoch ms) en que ocurre la averia; null para "ahora" (B07-B09)
 */
public record SolicitudRegistroAveria(@NotBlank String unidad, @NotNull Integer tipo, Long instanteMs) {

    /**
     * Averia en el instante actual del reloj.
     *
     * @param unidad codigo visible de la unidad
     * @param tipo   severidad de la averia: 1, 2 o 3
     */
    public SolicitudRegistroAveria(String unidad, Integer tipo) {
        this(unidad, tipo, null);
    }
}
