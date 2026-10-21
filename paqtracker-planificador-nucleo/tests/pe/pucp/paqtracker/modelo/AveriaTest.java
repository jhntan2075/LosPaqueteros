package pe.pucp.paqtracker.modelo;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pruebas unitarias de Averia: parsear interpreta una averia registrada
 * manualmente en linea de comandos, con el mismo formato de marca de tiempo
 * ddDhhHmmM que usan pedidos y bloqueos; la reincorporacion y el traslado
 * siguen las reglas de cada tipo.
 */
class AveriaTest {

    private static final int MINUTOS_DIA = 1440;
    private static final int DIEZ_AM = 10 * 60;

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

    @Test
    void getInstanteReincorporacion_tipo1_vuelveALasDosHoras() {
        Averia averia = new Averia(DIEZ_AM, 0, TipoAveria.TIPO_1);

        assertEquals(DIEZ_AM + 120, averia.getInstanteReincorporacion());
        assertFalse(averia.tieneTraslado());
        assertThrows(IllegalStateException.class, averia::getInstanteTraslado);
    }

    @Test
    void getInstanteReincorporacion_tipo2EnElTurnoDeLaManana_vuelveAlFinDelTurnoDeLaTarde() {
        Averia averia = new Averia(DIEZ_AM, 0, TipoAveria.TIPO_2);

        assertEquals(23 * 60, averia.getInstanteReincorporacion());
        assertEquals(DIEZ_AM + 240, averia.getInstanteTraslado());
    }

    @Test
    void getInstanteReincorporacion_tipo2EnElTurnoNocturno_vuelveAlFinDelTurnoDeLaMananaSiguiente() {
        Averia averia = new Averia(23 * 60 + 30, 0, TipoAveria.TIPO_2);

        assertEquals(MINUTOS_DIA + 15 * 60, averia.getInstanteReincorporacion());
    }

    @Test
    void getInstanteReincorporacion_tipo3AntesDeLasQuince_vuelveALasQuinceDosDiasDespues() {
        Averia averia = new Averia(DIEZ_AM, 0, TipoAveria.TIPO_3);

        assertEquals(2 * MINUTOS_DIA + 15 * 60, averia.getInstanteReincorporacion());
        assertEquals(DIEZ_AM + 240, averia.getInstanteTraslado());
    }

    @Test
    void getInstanteReincorporacion_tipo3DespuesDeLasQuince_esperaAlTurnoDeLasQuinceDelDiaSiguiente() {
        Averia averia = new Averia(16 * 60, 0, TipoAveria.TIPO_3);

        assertEquals(3 * MINUTOS_DIA + 15 * 60, averia.getInstanteReincorporacion());
    }

    @Test
    void desdeNumero_numerosValidos_devuelvenSuTipo() {
        assertEquals(TipoAveria.TIPO_1, TipoAveria.desdeNumero(1));
        assertEquals(TipoAveria.TIPO_3, TipoAveria.desdeNumero(3));
        assertEquals(2, TipoAveria.TIPO_2.getNumero());
    }

    @Test
    void desdeNumero_numeroFueraDeRango_lanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> TipoAveria.desdeNumero(4));
        assertThrows(IllegalArgumentException.class, () -> TipoAveria.desdeNumero(0));
    }
}
