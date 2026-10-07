package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.soporte.RelojControlable;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pruebas de RelojEjecucion: factor de aceleracion y pausas.
 */
class RelojEjecucionTest {

    private static final double DELTA = 1e-9;

    @Test
    void minutoActual_factor180UnMinutoReal_avanzaTresHorasSimuladas() {
        RelojControlable pared = new RelojControlable(Instant.EPOCH, ZoneOffset.UTC);
        RelojEjecucion reloj = new RelojEjecucion(pared, 100, 180);

        reloj.correr();
        pared.avanzar(Duration.ofMinutes(1));

        assertEquals(280, reloj.minutoActual(), DELTA);
    }

    @Test
    void minutoActual_pausado_noAvanzaHastaReanudar() {
        RelojControlable pared = new RelojControlable(Instant.EPOCH, ZoneOffset.UTC);
        RelojEjecucion reloj = new RelojEjecucion(pared, 0, 1);
        reloj.correr();
        pared.avanzar(Duration.ofMinutes(10));

        reloj.pausar();
        pared.avanzar(Duration.ofMinutes(30));
        double enPausa = reloj.minutoActual();
        reloj.correr();
        pared.avanzar(Duration.ofMinutes(5));

        assertEquals(10, enPausa, DELTA);
        assertEquals(15, reloj.minutoActual(), DELTA);
    }

    @Test
    void minutoActual_sinCorrer_quedaEnElMinutoInicial() {
        RelojControlable pared = new RelojControlable(Instant.EPOCH, ZoneOffset.UTC);
        RelojEjecucion reloj = new RelojEjecucion(pared, 42, 60);
        pared.avanzar(Duration.ofHours(1));

        assertEquals(42, reloj.minutoActual(), DELTA);
    }

    @Test
    void constructor_factorNoPositivo_lanzaExcepcion() {
        RelojControlable pared = new RelojControlable(Instant.EPOCH, ZoneOffset.UTC);
        assertThrows(IllegalArgumentException.class, () -> new RelojEjecucion(pared, 0, 0));
    }
}
