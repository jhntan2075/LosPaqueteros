package pe.pucp.paqtracker.planificador.comun;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias de ContadorEvaluaciones: conteo por instancia y presupuesto por ciclo.
 */
class ContadorEvaluacionesTest {

    @Test
    void registrar_dosContadores_noCompartenElConteo() {
        ContadorEvaluaciones primero = new ContadorEvaluaciones();
        ContadorEvaluaciones segundo = new ContadorEvaluaciones();

        primero.registrar();
        primero.registrar();

        assertEquals(2, primero.getTotal());
        assertEquals(0, segundo.getTotal());
    }

    @Test
    void presupuestoAgotado_alcanzaElTopeDelCiclo_retornaVerdaderoHastaReiniciar() {
        ContadorEvaluaciones contador = new ContadorEvaluaciones(2);
        contador.registrar();
        contador.registrar();

        assertTrue(contador.presupuestoAgotado());
        contador.reiniciarCiclo();
        assertFalse(contador.presupuestoAgotado());
        assertEquals(2, contador.getTotal());
    }

    @Test
    void constructor_presupuestoNoPositivo_lanzaExcepcion() {
        assertThrows(IllegalArgumentException.class, () -> new ContadorEvaluaciones(0));
    }
}
