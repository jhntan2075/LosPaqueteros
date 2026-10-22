package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.TipoAveria;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de la agenda de eventos del motor.
 */
class GestorEventosTest {

    @Test
    void entregarHasta_eventosEnDistintosInstantes_entregaSoloLosVencidosEnOrden() {
        GestorEventos agenda = new GestorEventos();
        GestorEventos.EventoAveria tardia = new GestorEventos.EventoAveria(1, TipoAveria.TIPO_2, 50);
        GestorEventos.EventoAveria temprana = new GestorEventos.EventoAveria(2, TipoAveria.TIPO_1, 10);
        GestorEventos.EventoAveria futura = new GestorEventos.EventoAveria(3, TipoAveria.TIPO_3, 90);
        agenda.encolar(tardia);
        agenda.encolar(futura);
        agenda.encolar(temprana);

        List<GestorEventos.EventoAveria> entregados = agenda.entregarHasta(50.5);

        assertEquals(List.of(temprana, tardia), entregados);
        assertTrue(agenda.tieneAveriaPendiente(3));
        assertFalse(agenda.tieneAveriaPendiente(1));
        assertEquals(List.of(futura), agenda.entregarHasta(90));
    }

    @Test
    void cancelar_unidadConAveriaEncolada_laRetiraSinTocarLasDeOtras() {
        GestorEventos agenda = new GestorEventos();
        agenda.encolar(new GestorEventos.EventoAveria(1, TipoAveria.TIPO_2, 10));
        agenda.encolar(new GestorEventos.EventoAveria(2, TipoAveria.TIPO_1, 10));

        assertTrue(agenda.cancelar(1));

        assertFalse(agenda.tieneAveriaPendiente(1));
        assertTrue(agenda.tieneAveriaPendiente(2));
        assertEquals(1, agenda.entregarHasta(10).size());
    }

    @Test
    void cancelar_sinAveriaEncolada_devuelveFalso() {
        assertFalse(new GestorEventos().cancelar(1));
    }

    @Test
    void cancelar_averiaYaEntregadaAlMotor_devuelveFalso() {
        GestorEventos agenda = new GestorEventos();
        agenda.encolar(new GestorEventos.EventoAveria(1, TipoAveria.TIPO_3, 5));
        agenda.entregarHasta(5);

        assertFalse(agenda.cancelar(1));
    }

    @Test
    void encolar_eventoNulo_lanzaIllegalArgumentException() {
        GestorEventos agenda = new GestorEventos();

        assertThrows(IllegalArgumentException.class, () -> agenda.encolar(null));
    }
}
