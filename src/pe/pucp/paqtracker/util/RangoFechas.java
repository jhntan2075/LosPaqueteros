package pe.pucp.paqtracker.util;

import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

/**
 * Rango inclusivo de fechas para una simulacion continua.
 */
public final class RangoFechas {

    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final LocalDate inicio;
    private final LocalDate fin;

    private RangoFechas(LocalDate inicio, LocalDate fin) {
        if (fin.isBefore(inicio)) {
            throw new IllegalArgumentException("La fecha final debe ser posterior a la inicial");
        }
        this.inicio = inicio;
        this.fin = fin;
    }

    /**
     * Parsea dos fechas en formato dd-MM-yyyy y arma el rango inclusivo.
     *
     * @param inicio fecha inicial del rango, formato dd-MM-yyyy
     * @param fin    fecha final del rango, formato dd-MM-yyyy
     * @return rango de fechas parseado
     * @throws IllegalArgumentException si alguna fecha no respeta el formato o fin es anterior a inicio
     */
    public static RangoFechas parsear(String inicio, String fin) {
        try {
            return new RangoFechas(LocalDate.parse(inicio, FORMATO),
                    LocalDate.parse(fin, FORMATO));
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(
                    "Las fechas deben tener formato dd-MM-yyyy", exception);
        }
    }

    /**
     * @return fecha inicial del rango
     */
    public LocalDate getInicio() {
        return inicio;
    }

    /**
     * @return fecha final del rango
     */
    public LocalDate getFin() {
        return fin;
    }

    /**
     * @return mes-anio de la fecha inicial del rango
     */
    public YearMonth getMesInicio() {
        return YearMonth.from(inicio);
    }

    /**
     * @return mes-anio de la fecha final del rango
     */
    public YearMonth getMesFin() {
        return YearMonth.from(fin);
    }

    /**
     * Calcula el desplazamiento en minutos entre el inicio del rango y el
     * primer dia del mes indicado, para concatenar archivos mensuales en una
     * linea temporal continua.
     *
     * @param mes mes cuyo desplazamiento se calcula
     * @return minutos transcurridos desde el inicio del rango hasta el primer dia de mes
     */
    public int minutosDesdeInicio(YearMonth mes) {
        LocalDate inicioMes = mes.atDay(1);
        return Math.toIntExact(Duration.between(
                inicio.atStartOfDay(), inicioMes.atStartOfDay()).toMinutes());
    }

    /**
     * Calcula el minuto absoluto (relativo al inicio del rango) de una fecha.
     *
     * @param fecha fecha a convertir
     * @return minutos transcurridos desde el inicio del rango hasta esa fecha
     */
    public int minutoDe(LocalDate fecha) {
        return Math.toIntExact(Duration.between(
                inicio.atStartOfDay(), fecha.atStartOfDay()).toMinutes());
    }

    /**
     * @return duracion total del rango en minutos, incluyendo el dia final completo
     */
    public int duracionMinutos() {
        return Math.toIntExact(Duration.between(
                inicio.atStartOfDay(), fin.plusDays(1).atStartOfDay()).toMinutes());
    }

    /**
     * Indica si un minuto absoluto (relativo al inicio del rango) cae dentro del rango.
     *
     * @param minutoAbsoluto minuto a evaluar
     * @return true si el minuto esta dentro de [0, duracionMinutos)
     */
    public boolean contiene(int minutoAbsoluto) {
        return minutoAbsoluto >= 0 && minutoAbsoluto < duracionMinutos();
    }

    /**
     * Indica si un mes esta cubierto, total o parcialmente, por el rango.
     *
     * @param mes mes a evaluar
     * @return true si mes esta entre el mes inicial y el mes final del rango
     */
    public boolean contieneMes(YearMonth mes) {
        return !mes.isBefore(getMesInicio()) && !mes.isAfter(getMesFin());
    }

    /**
     * Reconstruye la fecha calendario correspondiente a un minuto dentro de un mes.
     *
     * @param mes    mes de referencia
     * @param minuto minuto transcurrido desde el inicio de mes
     * @return fecha calendario resultante
     */
    public static LocalDate fechaDesdeMinutos(YearMonth mes, int minuto) {
        return mes.atDay(1).plus(minuto, ChronoUnit.MINUTES);
    }

    private RangoFechas() {
        throw new UnsupportedOperationException();
    }
}
