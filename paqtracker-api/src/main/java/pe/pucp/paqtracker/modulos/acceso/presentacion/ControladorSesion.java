package pe.pucp.paqtracker.modulos.acceso.presentacion;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.pucp.paqtracker.comun.excepcion.RespuestaError;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.ServicioSesiones;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.ServicioSesiones.ResultadoInicio;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.ServicioSesiones.Sesion;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.dto.EstadoSesion;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.dto.RespuestaInicioSesion;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.dto.SolicitudInicioSesion;
import java.util.List;
import java.util.Optional;

/**
 * API REST del login. Estas rutas no piden sesion: son las que permiten obtenerla.
 */
@RestController
@RequestMapping("/api/sesion")
public class ControladorSesion {

    /** Mensaje unico para usuario o clave incorrectos: no dice cual de los dos fallo. */
    static final String MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos";

    private final ServicioSesiones servicio;

    /**
     * @param servicio sesiones de la cuenta del equipo
     */
    public ControladorSesion(ServicioSesiones servicio) {
        this.servicio = servicio;
    }

    /**
     * @param autorizacion cabecera {@code Authorization: Bearer <token>}, opcional
     * @return si la API exige sesion y si el token enviado sigue vigente
     */
    @GetMapping
    public EstadoSesion consultar(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacion) {
        Optional<Sesion> sesion = servicio.validar(ServicioSesiones.tokenDe(autorizacion));
        return new EstadoSesion(servicio.seguridadActiva(), sesion.isPresent(),
                sesion.map(Sesion::usuario).orElse(null),
                sesion.map(s -> s.expiraEn().toEpochMilli()).orElse(null));
    }

    /**
     * Inicia sesion. Responde 401 si las credenciales no coinciden y 429 tras varios intentos fallidos.
     *
     * @param solicitud usuario y clave
     * @return token y vencimiento de la sesion
     */
    @PostMapping
    public ResponseEntity<?> iniciar(@Valid @RequestBody SolicitudInicioSesion solicitud) {
        ResultadoInicio resultado = servicio.iniciar(solicitud.usuario(), solicitud.clave());
        if (resultado.bloqueado()) {
            long segundos = Math.max(1, (resultado.bloqueadoPor().toMillis() + 999) / 1000);
            return error(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos fallidos. Espere " + segundos + " s antes de volver a intentar");
        }
        if (!resultado.aceptado()) {
            return error(HttpStatus.UNAUTHORIZED, MENSAJE_CREDENCIALES);
        }
        Sesion sesion = resultado.sesion();
        return ResponseEntity.ok(new RespuestaInicioSesion(sesion.token(), sesion.usuario(),
                sesion.expiraEn().toEpochMilli()));
    }

    /**
     * Cierra la sesion del token enviado. Responde 204 aunque el token ya no exista.
     *
     * @param autorizacion cabecera {@code Authorization: Bearer <token>}
     * @return 204
     */
    @DeleteMapping
    public ResponseEntity<Void> cerrar(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacion) {
        servicio.cerrar(ServicioSesiones.tokenDe(autorizacion));
        return ResponseEntity.noContent().build();
    }

    private static ResponseEntity<RespuestaError> error(HttpStatus estado, String mensaje) {
        return ResponseEntity.status(estado)
                .body(new RespuestaError(estado.value(), estado.getReasonPhrase(), mensaje, List.of()));
    }
}
