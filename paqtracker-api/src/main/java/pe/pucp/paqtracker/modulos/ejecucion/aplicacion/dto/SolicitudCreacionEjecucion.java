package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Datos para crear una simulacion de periodo (CU-16) o hasta el colapso (CU-17).
 *
 * @param tipoEscenario SIMULACION_PERIODO o COLAPSO_LOGISTICO
 * @param fechaInicio   primer dia simulado; se leen las ventas y bloqueos desde ese dia
 * @param dias          dias del periodo (solo para SIMULACION_PERIODO; por defecto 5)
 * @param algoritmo     GA o IACO (por defecto el configurado)
 * @param flota         composicion de la flota (por defecto la del dominio: 10 autos, 15 motos, 12 bicicletas)
 * @param horaInicio    hora del primer dia en la que arranca el reloj (por defecto 00:00)
 */
public record SolicitudCreacionEjecucion(@NotNull String tipoEscenario, @NotNull LocalDate fechaInicio,
                                         @Positive Integer dias, String algoritmo, @Valid ComposicionFlota flota,
                                         LocalTime horaInicio) {

    /**
     * @return la flota pedida, o la del dominio si no se indico
     */
    public ComposicionFlota flotaOPorDefecto() {
        return flota == null ? ComposicionFlota.porDefecto() : flota;
    }

    /**
     * @return la hora de inicio pedida, o la medianoche si no se indico
     */
    public LocalTime horaInicioOMedianoche() {
        return horaInicio == null ? LocalTime.MIDNIGHT : horaInicio;
    }

    /**
     * @return "2026-01-05" o, si arranca a otra hora, "2026-01-05 08:30"
     */
    public String descripcionInicio() {
        LocalTime hora = horaInicioOMedianoche();
        return hora.equals(LocalTime.MIDNIGHT) ? fechaInicio.toString() : fechaInicio + " " + hora.withSecond(0).withNano(0);
    }
}
