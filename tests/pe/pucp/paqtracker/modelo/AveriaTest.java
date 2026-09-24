package pe.pucp.paqtracker.modelo;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pruebas unitarias de Averia.parsear: interpreta una averia registrada
 * manualmente en linea de comandos, con el mismo formato de marca de tiempo
 * ddDhhHmmM que usan pedidos y bloqueos.
 */
class AveriaTest {

    @Test
    void parsear_textoValido_creaAveriaConLosCamposCorrectos() {
        Averia averia = Averia.parsear("3d10h30m,7,2");

        assertEquals((3 - 1) * 1440 + 10 * 60 + 30, averia.getInstante());
        assertEquals(7, averia.getIdVehiculo());
        assertEquals(TipoAveria.TIPO_2, averia.getTipo());
    }

    @Test
    void parsear_primerDia_instanteEsRelativoAlInicioDeLaSimulacion() {
        Averia averia = Averia.parsear("1d00h00m,3,1");

        assertEquals(0, averia.getInstante());
        assertEquals(TipoAveria.TIPO_1, averia.getTipo());
    }

    @Test
    void parsear_tipoInvalido_lanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> Averia.parsear("1d00h00m,3,9"));
    }

    @Test
    void parsear_menosCamposDeLosEsperados_lanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> Averia.parsear("1d00h00m,3"));
    }
}
