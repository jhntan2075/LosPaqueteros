package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Nodo;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

    @Test
    void camino_sinBloqueos_esEnLConLongitudManhattan() {
        Malla malla = new Malla();

        List<Nodo> camino = malla.camino(new Nodo(27, 14), new Nodo(40, 30), 0);

        assertEquals(List.of(new Nodo(27, 14), new Nodo(40, 14), new Nodo(40, 30)), camino);
    }

    @Test
    void camino_bloqueoParcialVigente_loRodeaConLaMismaLongitudQueLaDistancia() {
        Bloqueo bloqueo = new Bloqueo(INICIO, FIN, Malla.nodosDeTramo(30, 0, 30, 30));
        Malla malla = new Malla(List.of(bloqueo));
        Nodo origen = new Nodo(25, 20);
        Nodo destino = new Nodo(35, 20);

        List<Nodo> camino = malla.camino(origen, destino, INICIO);

        assertEquals(origen, camino.get(0));
        assertEquals(destino, camino.get(camino.size() - 1));
        assertEquals(malla.distancia(origen, destino, INICIO), longitud(camino));
        for (int i = 1; i < camino.size(); i++) {
            Nodo a = camino.get(i - 1);
            Nodo b = camino.get(i);
            for (long nodo : Malla.nodosDeTramo(a.getX(), a.getY(), b.getX(), b.getY())) {
                assertFalse(bloqueo.getNodosBloqueados().contains(nodo), "el camino cruza el bloqueo");
            }
        }
    }

    @Test
    void camino_origenIgualDestino_esUnSoloNodo() {
        Malla malla = new Malla();

        assertEquals(List.of(new Nodo(5, 5)), malla.camino(new Nodo(5, 5), new Nodo(5, 5), 0));
    }

    private static int longitud(List<Nodo> camino) {
        int total = 0;
        for (int i = 1; i < camino.size(); i++) {
            total += camino.get(i - 1).distanciaManhattan(camino.get(i));
        }
        return total;
    }

    /**
     * @param x columna que se bloquea por completo entre y=0 e y=50
     * @return bloqueo vigente entre INICIO y FIN
     */
    private Bloqueo bloqueoVertical(int x) {
        return new Bloqueo(INICIO, FIN, Malla.nodosDeTramo(x, 0, x, 50));
    }
}
