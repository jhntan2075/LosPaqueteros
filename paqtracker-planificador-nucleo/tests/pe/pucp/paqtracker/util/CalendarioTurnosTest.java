package pe.pucp.paqtracker.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias de CalendarioTurnos. Verifican los limites de cada turno
 * (07:00, 15:00, 23:00, duracion 480 min), el escalonado del refrigerio por
 * grupo de unidad y que avanzarConPausa incluya el refrigerio cuando el tramo
 * lo cruza o cuando el instante de partida ya cae dentro de el.
 */
class CalendarioTurnosTest {

    private static final int GRUPO_CERO = 0;
    private static final int GRUPO_DOS = 2;

    @Test
    void turnoInicio_instanteEnMedioDeTurno_devuelveInicioDelTurnoVigente() {
        assertEquals(420, CalendarioTurnos.turnoInicio(500));
    }

    @Test
    void turnoInicio_instanteAntesDelPrimerTurnoDelDia_devuelveTurnoNocturnoDelDiaAnterior() {
        assertEquals(-60, CalendarioTurnos.turnoInicio(100));
    }

    @Test
    void turnoFin_turnoDeLasSiete_terminaOchoHorasDespues() {
        assertEquals(900, CalendarioTurnos.turnoFin(500));
    }

    @Test
    void refrigerioInicio_grupoCero_empiezaTresHorasDespuesDelTurno() {
        assertEquals(600, CalendarioTurnos.refrigerioInicio(GRUPO_CERO, 500));
    }

    @Test
    void refrigerioInicio_grupoDos_empiezaCincoHorasDespuesDelTurno() {
        assertEquals(720, CalendarioTurnos.refrigerioInicio(GRUPO_DOS, 500));
    }

    @Test
    void enRefrigerio_instanteDentroDeLaVentana_devuelveVerdadero() {
        assertTrue(CalendarioTurnos.enRefrigerio(GRUPO_CERO, 650));
    }

    @Test
    void enRefrigerio_instanteFueraDeLaVentana_devuelveFalso() {
        assertFalse(CalendarioTurnos.enRefrigerio(GRUPO_CERO, 590));
    }

    @Test
    void avanzarConPausa_tramoNoTocaRefrigerio_avanzaSoloLaDuracion() {
        assertEquals(480, CalendarioTurnos.avanzarConPausa(GRUPO_CERO, 430, 50));
    }

    @Test
    void avanzarConPausa_tramoCruzaInicioDelRefrigerio_incluyeLaPausaCompleta() {
        assertEquals(680, CalendarioTurnos.avanzarConPausa(GRUPO_CERO, 580, 40));
    }

    @Test
    void avanzarConPausa_instanteYaDentroDelRefrigerio_esperaAQueTermineAntesDeAvanzar() {
        assertEquals(690, CalendarioTurnos.avanzarConPausa(GRUPO_CERO, 620, 30));
    }

    @Test
    void finDelSiguienteTurno_turnoDeLasSiete_terminaDieciseisHorasDespues() {
        assertEquals(1380, CalendarioTurnos.finDelSiguienteTurno(500));
    }

    @Test
    void proximoTurnoDeLasTres_instanteYaEnEseTurno_devuelveEseMismoInicio() {
        assertEquals(900, CalendarioTurnos.proximoTurnoDeLasTres(900));
    }

    @Test
    void proximoTurnoDeLasTres_instanteAntesDelTurno_devuelveElMismoDia() {
        assertEquals(900, CalendarioTurnos.proximoTurnoDeLasTres(500));
    }

    @Test
    void proximoTurnoDeLasTres_instanteDespuesDelTurno_avanzaAlDiaSiguiente() {
        assertEquals(2340, CalendarioTurnos.proximoTurnoDeLasTres(901));
    }
}
