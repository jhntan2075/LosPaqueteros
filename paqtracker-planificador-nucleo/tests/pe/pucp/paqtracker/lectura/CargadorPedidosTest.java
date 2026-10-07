package pe.pucp.paqtracker.lectura;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de la validacion linea por linea de archivos de ventas (CU-02).
 */
class CargadorPedidosTest {

    @Test
    void validar_lineasCorrectas_cuentaTodasSinErrores() {
        ResultadoValidacion resultado = CargadorPedidos.validar(List.of(
                "01d01h30m:56,30,c4910,02,36",
                "# comentario",
                "",
                "02d10h00m:10,40,c0001,05,12"));

        assertEquals(2, resultado.getRegistrosValidos());
        assertTrue(resultado.esValido());
    }

    @Test
    void validar_lineasInvalidas_informaCadaUnaConSuNumero() {
        ResultadoValidacion resultado = CargadorPedidos.validar(List.of(
                "01d01h30m:56,30,c4910,02,36",
                "01d01h30m:56,30",
                "01d01h30m:99,30,c4910,02,36",
                "01d01h30m:5,30,c4910,xx,36"));

        assertEquals(1, resultado.getRegistrosValidos());
        assertEquals(3, resultado.getErrores().size());
        assertEquals(List.of(2, 3, 4), resultado.getLineasInvalidas());
        assertTrue(resultado.getErrores().get(0).startsWith("Linea 2:"));
        assertTrue(resultado.getErrores().get(1).startsWith("Linea 3:"));
        assertTrue(resultado.getErrores().get(2).startsWith("Linea 4:"));
    }
}
