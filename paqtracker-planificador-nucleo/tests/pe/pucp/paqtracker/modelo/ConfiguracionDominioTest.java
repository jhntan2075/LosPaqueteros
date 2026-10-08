package pe.pucp.paqtracker.modelo;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pruebas de la construccion de la flota con composicion configurable (LE-019).
 */
class ConfiguracionDominioTest {

    @Test
    void crearFlota_composicionDosUnoTres_creaLasUnidadesEnOrdenConIdsConsecutivos() {
        Almacen central = ConfiguracionDominio.crearAlmacenes().get(0);

        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(central, 2, 1, 3);

        assertEquals(6, flota.size());
        assertEquals(List.of(TipoVehiculo.AUTO, TipoVehiculo.AUTO, TipoVehiculo.MOTOCICLETA,
                TipoVehiculo.BICICLETA, TipoVehiculo.BICICLETA, TipoVehiculo.BICICLETA),
                flota.stream().map(Vehiculo::getTipo).toList());
        assertEquals(5, flota.get(5).getId());
    }

    @Test
    void crearFlota_sinParametros_usaLaComposicionDelDominio() {
        Almacen central = ConfiguracionDominio.crearAlmacenes().get(0);

        assertEquals(ConfiguracionDominio.CANTIDAD_AUTOS + ConfiguracionDominio.CANTIDAD_MOTOS
                + ConfiguracionDominio.CANTIDAD_BICICLETAS, ConfiguracionDominio.crearFlota(central).size());
    }

    @Test
    void crearFlota_flotaVacia_lanzaExcepcion() {
        Almacen central = ConfiguracionDominio.crearAlmacenes().get(0);

        assertThrows(IllegalArgumentException.class, () -> ConfiguracionDominio.crearFlota(central, 0, 0, 0));
    }
}
