package pe.pucp.paqtracker.modelo;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de Tramo: posicion en un instante y corte del tramo para una averia.
 */
class TramoTest {

    private static final int ID_PEDIDO = 5;
    private static final int CANTIDAD = 3;
    private static final int DETENCION = 120;

    @Test
    void ubicacionEn_mitadDelTiempo_estaEnLaMitadDelCamino() {
        Tramo tramo = viajeRecto();

        assertEquals(5, tramo.kilometrosEn(50));
        assertEquals(new Nodo(5, 0), tramo.ubicacionEn(50));
        assertEquals(0, tramo.kilometrosEn(-10));
        assertEquals(10, tramo.kilometrosEn(500));
    }

    @Test
    void ubicacionEn_caminoEnL_sigueLosVerticesDelCamino() {
        Tramo tramo = new Tramo(TipoTramo.VIAJE_A_ENTREGA, new Nodo(0, 0), new Nodo(4, 6), 0, 10, 10,
                ID_PEDIDO, CANTIDAD, List.of(new Nodo(0, 0), new Nodo(4, 0), new Nodo(4, 6)));

        assertEquals(new Nodo(4, 3), tramo.ubicacionEn(7));
        assertEquals(List.of(new Nodo(0, 0), new Nodo(4, 0), new Nodo(4, 3)), tramo.recortarHasta(7).getCamino());
        assertEquals(List.of(new Nodo(4, 3), new Nodo(4, 6)), tramo.restoDesde(7, DETENCION).getCamino());
    }

    @Test
    void recortarHasta_viajeAEntrega_terminaEnElPuntoYNoCuentaComoEntrega() {
        Tramo recortado = viajeRecto().recortarHasta(50);

        assertEquals(new Nodo(5, 0), recortado.getDestino());
        assertEquals(50, recortado.getLlegada());
        assertEquals(5, recortado.getDistancia());
        assertFalse(recortado.esEntrega());
    }

    @Test
    void restoDesde_detencionDeDosHoras_saleDelPuntoDesplazadoYConservaLaEntrega() {
        Tramo resto = viajeRecto().restoDesde(50, DETENCION);

        assertEquals(new Nodo(5, 0), resto.getOrigen());
        assertEquals(50 + DETENCION, resto.getSalida());
        assertEquals(100 + DETENCION, resto.getLlegada());
        assertEquals(5, resto.getDistancia());
        assertTrue(resto.esEntrega());
        assertEquals(ID_PEDIDO, resto.getIdPedido());
        assertEquals(CANTIDAD, resto.getCantidad());
    }

    @Test
    void desplazar_treintaMinutos_mueveSalidaYLlegadaSinCambiarElRecorrido() {
        Tramo desplazado = viajeRecto().desplazar(30);

        assertEquals(30, desplazado.getSalida());
        assertEquals(130, desplazado.getLlegada());
        assertEquals(10, desplazado.getDistancia());
        assertEquals(viajeRecto().getCamino(), desplazado.getCamino());
    }

    private static Tramo viajeRecto() {
        return new Tramo(TipoTramo.VIAJE_A_ENTREGA, new Nodo(0, 0), new Nodo(10, 0), 0, 100, 10,
                ID_PEDIDO, CANTIDAD, List.of(new Nodo(0, 0), new Nodo(10, 0)));
    }
}
