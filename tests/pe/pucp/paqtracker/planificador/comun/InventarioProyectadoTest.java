package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas unitarias de InventarioProyectado: el stock proyectado parte del
 * stock disponible actual (no del inicial) y descuenta la carga de las rutas.
 */
class InventarioProyectadoTest {

    private static final int CAPACIDAD_INTERMEDIO = 1000;
    private static final int PLAZO_MAXIMO = 2160;
    private static final int TIEMPO_SERVICIO = 60;

    @Test
    void calcular_rutaDesdeIntermedio_descuentaCargaDelStockDisponible() {
        Almacen central = new Almacen(0, new Nodo(27, 14), true, Integer.MAX_VALUE);
        Almacen intermedio = new Almacen(1, new Nodo(12, 38), false, CAPACIDAD_INTERMEDIO);
        intermedio.descontar(100);
        Ruta ruta = new Ruta(new Vehiculo(0, TipoVehiculo.AUTO, intermedio), intermedio);
        ruta.getSecuencia().add(new Entrega(0, 0, new Nodo(10, 40), 20, 0, 240));
        SolucionRuteo solucion = new SolucionRuteo();
        solucion.getRutas().add(ruta);
        EscenarioOperativo escenario = new EscenarioOperativo(List.of(central, intermedio), List.of(),
                List.of(), 0, PLAZO_MAXIMO, null, TIEMPO_SERVICIO);

        Map<Integer, Integer> stock = InventarioProyectado.calcular(solucion, escenario);

        assertEquals(880, stock.get(intermedio.getId()));
        assertEquals(Integer.MAX_VALUE, stock.get(central.getId()));
    }
}
