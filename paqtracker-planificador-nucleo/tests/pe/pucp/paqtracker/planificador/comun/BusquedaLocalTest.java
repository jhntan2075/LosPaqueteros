package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import pe.pucp.paqtracker.util.Malla;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas unitarias de BusquedaLocal. Reproduce el patron hallado en la Etapa 3
 * (esc-10 y esc-03): con solo distancia como criterio, el Or-opt consolidaba dos
 * entregas cercanas en una ruta aunque la segunda llegara fuera de plazo.
 */
class BusquedaLocalTest {

    private static final int INSTANTE = 2070;
    private static final int PLAZO_AJUSTADO = 60;
    private static final int PLAZO_HOLGADO = 1440;

    private static final List<Almacen> ALMACENES = ConfiguracionDominio.crearAlmacenes();
    private static final Almacen CENTRAL = ALMACENES.get(0);

    @Test
    void optimizar_consolidarDejaEntregaTarde_mantieneRutasSeparadas() {
        SolucionRuteo solucion = dosRutasVecinas(PLAZO_AJUSTADO);
        EscenarioOperativo escenario = escenario();

        new BusquedaLocal(escenario).optimizar(solucion);

        assertEquals(2, rutasConEntregas(solucion));
        assertEquals(0, contarTardias(escenario, solucion));
    }

    @Test
    void optimizar_consolidarSinAtrasos_unificaEnUnaRuta() {
        SolucionRuteo solucion = dosRutasVecinas(PLAZO_HOLGADO);
        EscenarioOperativo escenario = escenario();

        new BusquedaLocal(escenario).optimizar(solucion);

        assertEquals(1, rutasConEntregas(solucion));
        assertEquals(0, contarTardias(escenario, solucion));
    }

    /**
     * Dos autos del central con una entrega cada uno, a 1 km entre si. Juntarlas
     * ahorra un viaje de ida y vuelta, pero la segunda llega despues de la
     * primera mas su tiempo de servicio.
     */
    private static SolucionRuteo dosRutasVecinas(int plazo) {
        SolucionRuteo solucion = new SolucionRuteo();
        solucion.getRutas().add(rutaDirecta(1, new Nodo(27, 34), plazo));
        solucion.getRutas().add(rutaDirecta(2, new Nodo(28, 34), plazo));
        return solucion;
    }

    private static Ruta rutaDirecta(int id, Nodo destino, int plazo) {
        Ruta ruta = new Ruta(new Vehiculo(id, TipoVehiculo.AUTO, CENTRAL), CENTRAL);
        ruta.getSecuencia().add(new Entrega(id, id, destino, 1, INSTANTE, plazo));
        ruta.setDestino(CENTRAL);
        return ruta;
    }

    private static EscenarioOperativo escenario() {
        return new EscenarioOperativo(ALMACENES, List.of(), List.of(), INSTANTE,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS, new Malla(),
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS);
    }

    private static long rutasConEntregas(SolucionRuteo solucion) {
        return solucion.getRutas().stream().filter(ruta -> !ruta.getSecuencia().isEmpty()).count();
    }

    private static int contarTardias(EscenarioOperativo escenario, SolucionRuteo solucion) {
        int tardias = 0;
        for (Ruta ruta : solucion.getRutas()) {
            tardias += CalculadoraTiempos.recorrer(escenario, ruta, INSTANTE)
                    [CalculadoraTiempos.INDICE_INCUMPLIMIENTOS];
        }
        return tardias;
    }
}
