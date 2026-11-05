package pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RepositorioRangosSemaforo;
import pe.pucp.paqtracker.soporte.PropiedadesPrueba;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Pruebas del servicio de rangos del semaforo con un repositorio en memoria.
 */
class ServicioRangosSemaforoTest {

    private static final Instant AHORA = Instant.parse("2026-11-05T15:00:00Z");
    private static final Clock RELOJ = Clock.fixed(AHORA, ZoneOffset.UTC);
    private static final RangosSemaforo INICIALES = RangosSemaforo.inicial(PropiedadesPrueba.crear().semaforo());

    @Test
    void crear_baseSinRangos_guardaLosDeLasVariablesDeEntorno() {
        RepositorioEnMemoria repositorio = new RepositorioEnMemoria(null);

        ServicioRangosSemaforo servicio = new ServicioRangosSemaforo(repositorio, PropiedadesPrueba.crear(), RELOJ);

        assertEquals(INICIALES, servicio.vigentes());
        assertEquals(INICIALES, repositorio.guardados);
        assertNull(repositorio.actualizadoEn);
    }

    @Test
    void crear_baseConRangosGuardados_usaLosGuardadosYNoLosDelEntorno() {
        RangosSemaforo guardados = conHolgura(0.05, 0.20);

        ServicioRangosSemaforo servicio = new ServicioRangosSemaforo(new RepositorioEnMemoria(guardados),
                PropiedadesPrueba.crear(), RELOJ);

        assertEquals(guardados, servicio.vigentes());
    }

    @Test
    void actualizar_rangosValidos_losGuardaYRigenDeInmediato() {
        RepositorioEnMemoria repositorio = new RepositorioEnMemoria(null);
        ServicioRangosSemaforo servicio = new ServicioRangosSemaforo(repositorio, PropiedadesPrueba.crear(), RELOJ);
        RangosSemaforo nuevos = conHolgura(0.10, 0.30);

        servicio.actualizar(nuevos);

        assertEquals(nuevos, servicio.vigentes());
        assertEquals(nuevos, repositorio.guardados);
        assertEquals(AHORA, repositorio.actualizadoEn);
    }

    private static RangosSemaforo conHolgura(double rojo, double ambar) {
        return new RangosSemaforo(new RangosSemaforo.CortesPorDebajo(rojo, ambar), INICIALES.inventario(),
                INICIALES.ocupacionUnidad(), INICIALES.ocupacionAlmacen());
    }

    /** Repositorio de una sola fila en memoria. */
    private static final class RepositorioEnMemoria implements RepositorioRangosSemaforo {

        private RangosSemaforo guardados;
        private Instant actualizadoEn;

        private RepositorioEnMemoria(RangosSemaforo guardados) {
            this.guardados = guardados;
        }

        @Override
        public Optional<RangosSemaforo> buscar() {
            return Optional.ofNullable(guardados);
        }

        @Override
        public RangosSemaforo guardar(RangosSemaforo rangos, Instant instante) {
            this.guardados = rangos;
            this.actualizadoEn = instante;
            return rangos;
        }
    }
}
