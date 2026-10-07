package pe.pucp.paqtracker.modelo;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias de TipoVehiculo: los parametros de cada tipo provienen de
 * la configuracion centralizada del dominio.
 */
class TipoVehiculoTest {

    @Test
    void capacidadMaxima_flotaConfigurada_retornaCapacidadDelAuto() {
        assertEquals(ConfiguracionDominio.CAPACIDAD_AUTO, TipoVehiculo.capacidadMaxima());
    }

    @Test
    void getCostoPorKm_todosLosTipos_retornaValorPositivo() {
        for (TipoVehiculo tipo : TipoVehiculo.values()) {
            assertTrue(tipo.getCostoPorKm() > 0, tipo.name());
        }
    }

    @Test
    void getVelocidad_motocicleta_retornaValorConfigurado() {
        assertEquals(ConfiguracionDominio.VELOCIDAD_MOTOCICLETA, TipoVehiculo.MOTOCICLETA.getVelocidad());
    }
}
