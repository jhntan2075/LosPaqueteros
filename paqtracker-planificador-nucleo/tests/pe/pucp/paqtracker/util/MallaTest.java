package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
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

    /** Una bicicleta tarda 25 minutos en recorrer los 5 km hasta x=30: sale 10 minutos antes del cambio. */
    private static final int MINUTOS_ANTES_DEL_BLOQUEO = 10;

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
    void distancia_bloqueoIniciaDuranteElViaje_loRodea() {
        Malla malla = new Malla(List.of(bloqueoParcial()));
        Nodo origen = new Nodo(25, 20);
        Nodo destino = new Nodo(35, 20);
        // La bicicleta sale antes del bloqueo y llega a x=30 cuando ya esta vigente.
        int salida = INICIO - MINUTOS_ANTES_DEL_BLOQUEO;

        int foto = malla.distancia(origen, destino, salida);
        int recorrida = malla.distancia(origen, destino, salida, bicicleta());

        assertEquals(10, foto);
        assertTrue(recorrida > 10, "deberia rodear el bloqueo que empieza en el viaje, pero dio " + recorrida);
    }

    @Test
    void distancia_bloqueoTerminaAntesDeLlegar_noDesvia() {
        Malla malla = new Malla(List.of(bloqueoParcial()));
        Nodo origen = new Nodo(25, 20);
        Nodo destino = new Nodo(35, 20);
        // Vigente al salir, pero levantado cuando la bicicleta llega a x=30.
        int salida = FIN - MINUTOS_ANTES_DEL_BLOQUEO;

        assertTrue(malla.distancia(origen, destino, salida) > 10);
        assertEquals(10, malla.distancia(origen, destino, salida, bicicleta()));
    }

    @Test
    void camino_bloqueoIniciaDuranteElViaje_noPisaNodosBloqueadosAlPasar() {
        Bloqueo bloqueo = bloqueoParcial();
        Malla malla = new Malla(List.of(bloqueo));
        Nodo origen = new Nodo(25, 20);
        Nodo destino = new Nodo(35, 20);
        Vehiculo vehiculo = bicicleta();
        int salida = INICIO - MINUTOS_ANTES_DEL_BLOQUEO;

        List<Nodo> camino = malla.camino(origen, destino, salida, vehiculo);

        assertEquals(malla.distancia(origen, destino, salida, vehiculo), longitud(camino));
        int kilometros = 0;
        for (int i = 1; i < camino.size(); i++) {
            Nodo a = camino.get(i - 1);
            Nodo b = camino.get(i);
            int pasoX = Integer.signum(b.getX() - a.getX());
            int pasoY = Integer.signum(b.getY() - a.getY());
            for (int x = a.getX() + pasoX, y = a.getY() + pasoY; ; x += pasoX, y += pasoY) {
                kilometros++;
                int instante = CalendarioTurnos.avanzarConPausa(vehiculo.getId(), salida,
                        CalculadoraTiempos.minutosDeViaje(kilometros, vehiculo.getTipo()));
                boolean bloqueado = bloqueo.estaVigente(instante)
                        && bloqueo.getNodosBloqueados().contains(Malla.codificar(x, y));
                assertFalse(bloqueado, "pisa (" + x + "," + y + ") en el minuto " + instante);
                if (x == b.getX() && y == b.getY()) {
                    break;
                }
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
     * @return bloqueo de la columna x=30 entre y=0 e y=30, vigente entre INICIO y FIN
     */
    private static Bloqueo bloqueoParcial() {
        return new Bloqueo(INICIO, FIN, Malla.nodosDeTramo(30, 0, 30, 30));
    }

    /**
     * @return bicicleta (la unidad mas lenta) con un id cuyo refrigerio no cae en las pruebas
     */
    private static Vehiculo bicicleta() {
        Almacen central = new Almacen(0, new Nodo(27, 14), true, 0);
        return new Vehiculo(0, TipoVehiculo.BICICLETA, central);
    }

    /**
     * @param x columna que se bloquea por completo entre y=0 e y=50
     * @return bloqueo vigente entre INICIO y FIN
     */
    private Bloqueo bloqueoVertical(int x) {
        return new Bloqueo(INICIO, FIN, Malla.nodosDeTramo(x, 0, x, 50));
    }
}
