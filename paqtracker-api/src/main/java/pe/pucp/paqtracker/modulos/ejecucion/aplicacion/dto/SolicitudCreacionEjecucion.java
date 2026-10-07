package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

/**
 * Datos para crear una simulacion de periodo (CU-16) o hasta el colapso (CU-17).
 *
 * @param tipoEscenario SIMULACION_PERIODO o COLAPSO_LOGISTICO
 * @param fechaInicio   primer dia simulado; se leen las ventas y bloqueos desde ese dia
 * @param dias          dias del periodo (solo para SIMULACION_PERIODO; por defecto 5)
 * @param algoritmo     GA o IACO (por defecto el configurado)
 */
public record SolicitudCreacionEjecucion(@NotNull String tipoEscenario, @NotNull LocalDate fechaInicio,
                                         @Positive Integer dias, String algoritmo) {
}
