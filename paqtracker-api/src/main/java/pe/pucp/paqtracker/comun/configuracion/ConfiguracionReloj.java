package pe.pucp.paqtracker.comun.configuracion;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;
import java.time.ZoneId;

/**
 * Reloj de pared de la aplicacion, en la zona horaria de la operacion. Se inyecta en lugar de llamar
 * a {@code System.currentTimeMillis()} para poder controlar el tiempo en las pruebas.
 */
@Configuration
public class ConfiguracionReloj {

    /**
     * @param propiedades parametros de la operacion
     * @return reloj del sistema en la zona horaria configurada
     */
    @Bean
    public Clock relojSistema(PropiedadesDominio propiedades) {
        return Clock.system(ZoneId.of(propiedades.ejecucion().zonaHoraria()));
    }
}
