package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas de la posicion y la ruta restante sobre un camino con desvio (cuatro vertices).
 */
class RecorridoCaminoTest {

    /** Rodeo de un bloqueo: sube 5, avanza 10 y baja 5 (longitud total 20). */
    private static final List<Nodo> CAMINO = List.of(new Nodo(0, 0), new Nodo(0, 5), new Nodo(10, 5),
            new Nodo(10, 0));

    @Test
    void posicion_mitadDelCamino_quedaEnElTramoHorizontal() {
        assertEquals(new Coordenada(5, 5), RecorridoCamino.posicion(CAMINO, 0.5));
    }

    @Test
    void restante_mitadDelCamino_empiezaEnLaPosicionYSigueLosVerticesPendientes() {
        assertEquals(List.of(new Coordenada(5, 5), new Coordenada(10, 5), new Coordenada(10, 0)),
                RecorridoCamino.restante(CAMINO, 0.5));
    }

    @Test
    void restante_caminoTerminado_soloQuedaElDestino() {
        assertEquals(List.of(new Coordenada(10, 0)), RecorridoCamino.restante(CAMINO, 1.0));
    }

    @Test
    void restante_caminoDeUnSoloNodo_devuelveEseNodo() {
        assertEquals(List.of(new Coordenada(3, 3)), RecorridoCamino.restante(List.of(new Nodo(3, 3)), 0.4));
    }
}
