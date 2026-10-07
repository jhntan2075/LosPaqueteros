package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas unitarias del Fragmentador. Verifican que un pedido se divide solo
 * cuando excede la capacidad maxima de la flota y que la suma de los fragmentos
 * conserva la cantidad original.
 */
class FragmentadorTest {

    private static final int CAPACIDAD_MAXIMA = 24;

    @Test
    void fragmentar_pedidoDentroDeCapacidad_noSeDivide() {
        Pedido pedido = new Pedido(0, new Nodo(10, 10), 20, 0, 240);
        List<Entrega> entregas = Fragmentador.fragmentar(List.of(pedido), CAPACIDAD_MAXIMA);
        assertEquals(1, entregas.size());
        assertEquals(20, entregas.get(0).getCantidad());
    }

    @Test
    void fragmentar_pedidoExcedeCapacidad_seDivideConservandoCantidad() {
        Pedido pedido = new Pedido(0, new Nodo(10, 10), 30, 0, 240);
        List<Entrega> entregas = Fragmentador.fragmentar(List.of(pedido), CAPACIDAD_MAXIMA);
        assertEquals(2, entregas.size());
        int suma = entregas.get(0).getCantidad() + entregas.get(1).getCantidad();
        assertEquals(30, suma);
    }

    @Test
    void fragmentar_fragmentosConservanDestinoYPlazo() {
        Pedido pedido = new Pedido(7, new Nodo(15, 25), 50, 100, 480);
        List<Entrega> entregas = Fragmentador.fragmentar(List.of(pedido), CAPACIDAD_MAXIMA);
        for (Entrega entrega : entregas) {
            assertEquals(7, entrega.getIdPedido());
            assertEquals(new Nodo(15, 25), entrega.getDestino());
            assertEquals(580, entrega.getHoraLimite());
        }
    }
}
