package pe.pucp.paqtracker.modulos.acceso.aplicacion;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.time.Duration;

/**
 * Configuracion del login (prefijo {@code paqtracker.seguridad}).
 *
 * @param activa         si la API exige sesion; apagada solo en las pruebas que no son del login
 * @param usuario        nombre de la cuenta compartida del equipo
 * @param claveHash      hash BCrypt de la clave; la clave en claro nunca se configura
 * @param duracionSesion cuanto dura una sesion desde que se inicia
 */
@ConfigurationProperties(prefix = "paqtracker.seguridad")
public record PropiedadesSeguridad(boolean activa, String usuario, String claveHash, Duration duracionSesion) {

    private static final Duration DURACION_POR_DEFECTO = Duration.ofHours(12);

    /**
     * Completa los valores ausentes con los por defecto.
     */
    public PropiedadesSeguridad {
        usuario = usuario == null ? "" : usuario.trim();
        claveHash = claveHash == null ? "" : claveHash.trim();
        if (duracionSesion == null || duracionSesion.isZero() || duracionSesion.isNegative()) {
            duracionSesion = DURACION_POR_DEFECTO;
        }
    }
}
