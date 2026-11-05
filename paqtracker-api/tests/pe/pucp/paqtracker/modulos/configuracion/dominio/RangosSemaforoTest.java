package pe.pucp.paqtracker.modulos.configuracion.dominio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.soporte.PropiedadesPrueba;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de las reglas de los rangos del semaforo: valores iniciales, nivel y validacion de umbrales.
 */
class RangosSemaforoTest {

    private static final RangosSemaforo INICIALES = RangosSemaforo.inicial(PropiedadesPrueba.crear().semaforo());

    @Test
    void inicial_propiedadesPorDefecto_conservaLosValoresQueRegianAntes() {
        assertEquals(new RangosSemaforo.CortesPorDebajo(0.15, 0.40), INICIALES.holgura());
        assertEquals(new RangosSemaforo.CortesPorDebajo(0.20, 0.50), INICIALES.inventario());
        assertEquals(new RangosSemaforo.CortesCarga(0.0, 0.70, 0.90), INICIALES.ocupacionUnidad());
        assertEquals(new RangosSemaforo.CortesCarga(0.0, 0.50, 0.80), INICIALES.ocupacionAlmacen());
    }

    @Test
    void nivel_fraccionesEnCadaTramo_devuelveRojoAmbarYVerde() {
        RangosSemaforo.CortesPorDebajo holgura = INICIALES.holgura();

        assertEquals("ROJO", holgura.nivel(-0.1));
        assertEquals("ROJO", holgura.nivel(0.149));
        assertEquals("AMBAR", holgura.nivel(0.15));
        assertEquals("AMBAR", holgura.nivel(0.399));
        assertEquals("VERDE", holgura.nivel(0.40));
    }

    @Test
    void crear_holguraConRojoMayorQueAmbar_fallaConMensajeClaro() {
        SolicitudInvalidaException error = assertThrows(SolicitudInvalidaException.class,
                () -> conHolgura(new RangosSemaforo.CortesPorDebajo(0.5, 0.4)));

        assertTrue(error.getMessage().startsWith("Holgura"));
    }

    @Test
    void crear_umbralesIgualesOFueraDeRango_falla() {
        assertThrows(SolicitudInvalidaException.class, () -> conHolgura(new RangosSemaforo.CortesPorDebajo(0.3, 0.3)));
        assertThrows(SolicitudInvalidaException.class, () -> conHolgura(new RangosSemaforo.CortesPorDebajo(-0.1, 0.3)));
        assertThrows(SolicitudInvalidaException.class, () -> conHolgura(new RangosSemaforo.CortesPorDebajo(0.1, 1.1)));
        assertThrows(SolicitudInvalidaException.class,
                () -> conHolgura(new RangosSemaforo.CortesPorDebajo(Double.NaN, 0.3)));
    }

    @Test
    void crear_ocupacionConVacioNoMenorQueAmbar_falla() {
        SolicitudInvalidaException error = assertThrows(SolicitudInvalidaException.class,
                () -> conOcupacionUnidad(new RangosSemaforo.CortesCarga(0.7, 0.7, 0.9)));

        assertTrue(error.getMessage().startsWith("Ocupación de unidades"));
    }

    @Test
    void crear_ocupacionConAmbarNoMenorQueRojo_falla() {
        assertThrows(SolicitudInvalidaException.class,
                () -> conOcupacionUnidad(new RangosSemaforo.CortesCarga(0.0, 0.9, 0.9)));
    }

    @Test
    void crear_ocupacionConVacioPositivoYOrdenCoherente_seAcepta() {
        RangosSemaforo rangos = conOcupacionUnidad(new RangosSemaforo.CortesCarga(0.1, 0.6, 1.0));

        assertEquals(0.1, rangos.ocupacionUnidad().vacio());
    }

    @Test
    void crear_grupoFaltante_falla() {
        assertThrows(SolicitudInvalidaException.class, () -> new RangosSemaforo(null, INICIALES.inventario(),
                INICIALES.ocupacionUnidad(), INICIALES.ocupacionAlmacen()));
    }

    private static RangosSemaforo conHolgura(RangosSemaforo.CortesPorDebajo holgura) {
        return new RangosSemaforo(holgura, INICIALES.inventario(), INICIALES.ocupacionUnidad(),
                INICIALES.ocupacionAlmacen());
    }

    private static RangosSemaforo conOcupacionUnidad(RangosSemaforo.CortesCarga ocupacion) {
        return new RangosSemaforo(INICIALES.holgura(), INICIALES.inventario(), ocupacion,
                INICIALES.ocupacionAlmacen());
    }
}
