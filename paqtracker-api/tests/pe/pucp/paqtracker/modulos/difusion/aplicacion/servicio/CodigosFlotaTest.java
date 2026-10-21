package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas de los codigos visibles de la flota.
 */
class CodigosFlotaTest {

    private final List<Vehiculo> flota = ConfiguracionDominio.crearFlota(
            ConfiguracionDominio.crearAlmacenes().get(0), 2, 2, 2);

    @Test
    void idDe_codigoDeLaFlota_devuelveSuUnidad() {
        CodigosFlota codigos = CodigosFlota.de(flota);

        assertEquals(Optional.of(3), codigos.idDe("M-02"));
        assertEquals(Optional.of(4), codigos.idDe(" b-01 "));
    }

    @Test
    void idDe_codigoAjenoONulo_devuelveVacio() {
        CodigosFlota codigos = CodigosFlota.de(flota);

        assertEquals(Optional.empty(), codigos.idDe("A-09"));
        assertEquals(Optional.empty(), codigos.idDe(null));
    }
}
