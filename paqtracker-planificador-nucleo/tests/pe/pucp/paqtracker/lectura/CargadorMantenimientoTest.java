package pe.pucp.paqtracker.lectura;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.lectura.CargadorMantenimiento.LineaMantenimiento;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pruebas de la lectura y validacion del plan de mantenimiento preventivo. */
class CargadorMantenimientoTest {

    @Test
    void leer_lineasValidas_devuelveFechaTipoYNumeroDeCadaUnidad() {
        List<LineaMantenimiento> leidas = CargadorMantenimiento.leer(List.of("20260901:TA01", "", "# comentario",
                "20260902:TM07\r", "20261031:TB64"));

        assertEquals(List.of(
                new LineaMantenimiento(LocalDate.of(2026, 9, 1), TipoVehiculo.AUTO, 1),
                new LineaMantenimiento(LocalDate.of(2026, 9, 2), TipoVehiculo.MOTOCICLETA, 7),
                new LineaMantenimiento(LocalDate.of(2026, 10, 31), TipoVehiculo.BICICLETA, 64)), leidas);
        assertEquals("TB64", leidas.get(2).codigoArchivo());
    }

    @Test
    void validar_informaTodasLasLineasInvalidasConSuNumero() {
        ResultadoValidacion resultado = CargadorMantenimiento.validar(List.of(
                "20260901:TA01", "20260231:TA02", "20260903:TX01", "2026090:TA03", "20260905:TA00", "20260901:TA01"));

        assertFalse(resultado.esValido());
        assertEquals(1, resultado.getRegistrosValidos());
        assertEquals(List.of(2, 3, 4, 5, 6), resultado.getLineasInvalidas());
        assertTrue(resultado.getErrores().get(0).contains("fecha inexistente"));
        assertTrue(resultado.getErrores().get(4).contains("ya tiene mantenimiento"));
    }

    @Test
    void leer_conUnaLineaInvalida_lanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> CargadorMantenimiento.leer(List.of("20260901-TA01")));
    }
}
