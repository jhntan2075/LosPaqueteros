package pe.pucp.paqtracker.lectura;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de la validacion linea por linea de archivos de bloqueos.
 */
class CargadorBloqueosTest {

    @Test
    void validar_lineasCorrectas_cuentaTodasSinErrores() {
        ResultadoValidacion resultado = CargadorBloqueos.validar(List.of(
                "01d02h22m-01d04h42m:25,45,45,45,45,40",
                "",
                "02d00h00m-02d06h00m:10,10,10,20"));

        assertEquals(2, resultado.getRegistrosValidos());
        assertTrue(resultado.esValido());
    }

    @Test
    void validar_lineasInvalidas_informaSusNumeros() {
        ResultadoValidacion resultado = CargadorBloqueos.validar(List.of(
                "01d02h22m-01d04h42m:25,45,45,45",
                "01d02h22m-01d04h42m:25,45,30,40",
                "01d04h00m-01d02h00m:25,45,45,45",
                "01d02h22m-01d04h42m:25,45",
                "01d02h22m-01d04h42m:25,45,99,45"));

        assertEquals(1, resultado.getRegistrosValidos());
        assertEquals(List.of(2, 3, 4, 5), resultado.getLineasInvalidas());
    }
}
