package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import java.util.HashMap;
import java.util.Map;

/**
 * Calcula el stock que quedara en cada almacen despues de despachar las rutas de
 * una solucion. El almacen central es ilimitado. Se usa tanto para validar el
 * stock de salida como para validar el almacen de retorno.
 */
public final class InventarioProyectado {

    /**
     * Proyecta el stock de cada almacen tras despachar las rutas de la solucion.
     *
     * @param solucion  solucion cuyas rutas descuentan stock
     * @param escenario escenario con los almacenes y su stock inicial
     * @return mapa de identificador de almacen a stock proyectado
     */
    public static Map<Integer, Integer> calcular(SolucionRuteo solucion, EscenarioOperativo escenario) {
        Map<Integer, Integer> stock = new HashMap<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            stock.put(almacen.getId(),
                    almacen.esIlimitado() ? Integer.MAX_VALUE : almacen.getStockInicial());
        }
        for (Ruta ruta : solucion.getRutas()) {
            if (ruta.getOrigen().esIlimitado()) {
                continue;
            }
            stock.put(ruta.getOrigen().getId(),
                    stock.get(ruta.getOrigen().getId()) - ruta.getCarga());
        }
        return stock;
    }

    private InventarioProyectado() {
    }
}
