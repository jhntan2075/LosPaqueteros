package pe.pucp.paqtracker.modelo;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias del Almacen: descuento de inventario al despachar desde un
 * intermedio y recarga diaria a su capacidad maxima.
 */
class AlmacenTest {

    private static final int CAPACIDAD_INTERMEDIO = 1000;

    @Test
    void descontar_intermedioConStock_reduceStockDisponible() {
        Almacen intermedio = new Almacen(1, new Nodo(12, 38), false, CAPACIDAD_INTERMEDIO);

        intermedio.descontar(24);

        assertEquals(976, intermedio.getStockDisponible());
    }

    @Test
    void descontar_cargaMayorAlStock_lanzaCapacidadExcedida() {
        Almacen intermedio = new Almacen(1, new Nodo(12, 38), false, 10);

        assertThrows(CapacidadExcedidaException.class, () -> intermedio.descontar(11));
        assertEquals(10, intermedio.getStockDisponible());
    }

    @Test
    void descontar_almacenCentral_noAgotaInventario() {
        Almacen central = new Almacen(0, new Nodo(27, 14), true, Integer.MAX_VALUE);

        central.descontar(5000);

        assertTrue(central.tieneStock(Integer.MAX_VALUE));
    }

    @Test
    void recargar_intermedioConsumido_vuelveACapacidadMaxima() {
        Almacen intermedio = new Almacen(2, new Nodo(57, 27), false, CAPACIDAD_INTERMEDIO);
        intermedio.descontar(CAPACIDAD_INTERMEDIO);
        assertFalse(intermedio.tieneStock(1));

        intermedio.recargar();

        assertEquals(CAPACIDAD_INTERMEDIO, intermedio.getStockDisponible());
    }
}
