package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.simulacion.UnidadEnTransito;
import java.util.List;
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

    @Test
    void rutaRestante_aMitadDelPrimerTramo_incluyeElRestoYElRetornoSinRepetirVertices() {
        Almacen central = ConfiguracionDominio.crearAlmacenes().get(0);
        List<Tramo> tramos = List.of(
                new Tramo(TipoTramo.VIAJE_A_ENTREGA, new Nodo(0, 0), new Nodo(10, 0), 0, 10, 10, 1, 2),
                new Tramo(TipoTramo.SERVICIO, new Nodo(10, 0), new Nodo(10, 0), 10, 70, 0, 1, 0),
                new Tramo(TipoTramo.RETORNO, new Nodo(10, 0), new Nodo(10, 10), 70, 80, 10, Tramo.SIN_PEDIDO, 0));
        UnidadEnTransito unidad = new UnidadEnTransito(new Vehiculo(0, TipoVehiculo.AUTO, central), central, 0, 80,
                central, tramos);

        assertEquals(List.of(new Coordenada(5, 0), new Coordenada(10, 0), new Coordenada(10, 10)),
                ConstructorInstantanea.rutaRestante(unidad, 5));
        assertEquals(List.of(new Coordenada(10, 5), new Coordenada(10, 10)),
                ConstructorInstantanea.rutaRestante(unidad, 75));
    }
}
