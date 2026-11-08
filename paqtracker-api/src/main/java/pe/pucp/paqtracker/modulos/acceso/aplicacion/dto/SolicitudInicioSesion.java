package pe.pucp.paqtracker.modulos.acceso.aplicacion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credenciales del login.
 *
 * @param usuario nombre de la cuenta del equipo
 * @param clave   clave en claro; viaja solo por HTTPS en el despliegue
 */
public record SolicitudInicioSesion(
        @NotBlank(message = "es obligatorio") @Size(max = 100) String usuario,
        @NotBlank(message = "es obligatoria") @Size(max = 200) String clave) {

    @Override
    public String toString() {
        return "SolicitudInicioSesion[usuario=" + usuario + ", clave=***]";
    }
}
