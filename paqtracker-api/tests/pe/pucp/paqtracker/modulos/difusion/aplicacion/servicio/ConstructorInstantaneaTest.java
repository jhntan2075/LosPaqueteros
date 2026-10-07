package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas de la interpolacion de posicion: camino en L, primero el eje x y luego el y.
 */
class ConstructorInstantaneaTest {

    private static final Tramo TRAMO = new Tramo(TipoTramo.VIAJE_A_ENTREGA, new Nodo(0, 0), new Nodo(10, 10),
            100, 120, 20, 1, 2);

    @Test
    void interpolar_cuartoDelTramo_avanzaSoloEnX() {
        assertEquals(new Coordenada(5, 0), ConstructorInstantanea.interpolar(TRAMO, 105));
    }

    @Test
    void interpolar_tresCuartosDelTramo_yaRecorrioXYAvanzaEnY() {
        assertEquals(new Coordenada(10, 5), ConstructorInstantanea.interpolar(TRAMO, 115));
    }

    @Test
    void interpolar_fueraDelTramo_quedaEnSusExtremos() {
        assertEquals(new Coordenada(0, 0), ConstructorInstantanea.interpolar(TRAMO, 90));
        assertEquals(new Coordenada(10, 10), ConstructorInstantanea.interpolar(TRAMO, 200));
    }
}
