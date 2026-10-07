package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Nodo;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias de la Malla: distancia con y sin bloqueos, y equivalencia
 * de la cache por tramos de tiempo con el calculo directo.
 */
class MallaTest {

    private static final int INICIO = 1000;
    private static final int FIN = 2000;

    @Test
    void distancia_sinBloqueos_retornaManhattan() {
        Malla malla = new Malla();

        assertEquals(29, malla.distancia(new Nodo(27, 14), new Nodo(40, 30), 0));
    }

    @Test
    void distancia_bloqueoFueraDeVigencia_retornaManhattan() {
        Malla malla = new Malla(List.of(bloqueoVertical(30)));

        assertEquals(20, malla.distancia(new Nodo(25, 20), new Nodo(35, 30), FIN + 1));
    }

    @Test
    void distancia_bloqueoVigenteEnElCamino_rodeaYEsMayorQueManhattan() {
        Malla malla = new Malla(List.of(bloqueoVertical(30)));
        Nodo origen = new Nodo(25, 20);
        Nodo destino = new Nodo(35, 20);

        int conBloqueo = malla.distancia(origen, destino, INICIO);

        assertTrue(conBloqueo > origen.distanciaManhattan(destino),
                "deberia rodear, pero dio " + conBloqueo);
    }

    @Test
    void distancia_mismoInstanteDosVeces_devuelveElMismoValor() {
        Malla malla = new Malla(List.of(bloqueoVertical(30)));
        Nodo origen = new Nodo(25, 20);
        Nodo destino = new Nodo(35, 20);

        int primera = malla.distancia(origen, destino, INICIO);
        int segunda = malla.distancia(origen, destino, INICIO);

        assertEquals(primera, segunda);
    }

    @Test
    void distancia_alCruzarElFinDelBloqueo_dejaDeRodear() {
        Malla malla = new Malla(List.of(bloqueoVertical(30)));
        Nodo origen = new Nodo(25, 20);
        Nodo destino = new Nodo(35, 20);

        // El mismo par de nodos, antes, durante y despues de la vigencia: la
        // cache por tramos no debe arrastrar el resultado de un tramo a otro.
        assertEquals(10, malla.distancia(origen, destino, INICIO - 1));
        assertTrue(malla.distancia(origen, destino, FIN) > 10);
        assertEquals(10, malla.distancia(origen, destino, FIN + 1));
    }

    /**
     * @param x columna que se bloquea por completo entre y=0 e y=50
     * @return bloqueo vigente entre INICIO y FIN
     */
    private Bloqueo bloqueoVertical(int x) {
        return new Bloqueo(INICIO, FIN, Malla.nodosDeTramo(x, 0, x, 50));
    }
}
