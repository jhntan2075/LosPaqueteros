package pe.pucp.paqtracker.modulos.acceso.aplicacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Inicia, valida y cierra sesiones de la cuenta compartida. Las sesiones viven en memoria: al reiniciar
 * la API hay que volver a ingresar, lo que basta para una sola instancia y una cuenta de equipo.
 *
 * <p>Tras {@value #INTENTOS_ANTES_DE_BLOQUEO} intentos fallidos seguidos, el login se bloquea
 * {@link #DURACION_BLOQUEO} para frenar la prueba de claves al azar.
 */
@Service
public class ServicioSesiones {

    /** Intentos fallidos seguidos que bloquean el login un rato. */
    static final int INTENTOS_ANTES_DE_BLOQUEO = 5;
    /** Cuanto dura el bloqueo tras los intentos fallidos. */
    static final Duration DURACION_BLOQUEO = Duration.ofSeconds(30);

    private static final Logger LOGGER = LoggerFactory.getLogger(ServicioSesiones.class);
    private static final Pattern FORMATO_BCRYPT = Pattern.compile("^\\$2[aby]?\\$\\d{2}\\$[./A-Za-z0-9]{53}$");
    private static final int BYTES_TOKEN = 32;
    private final PropiedadesSeguridad propiedades;
    private final Clock reloj;
    private final BCryptPasswordEncoder cifrador = new BCryptPasswordEncoder();
    /** Hash de relleno: se compara aunque el usuario no coincida, para que el tiempo de respuesta no lo delate. */
    private final String hashRelleno = cifrador.encode("relleno-" + System.nanoTime());
    private final SecureRandom aleatorio = new SecureRandom();
    private final Map<String, Sesion> sesiones = new ConcurrentHashMap<>();
    private int fallosSeguidos;
    private Instant bloqueadoHasta = Instant.MIN;

    /**
     * @param propiedades usuario, hash de la clave y duracion de la sesion
     * @param reloj       reloj de pared de la aplicacion
     * @throws IllegalStateException si la seguridad esta activa y falta el usuario o el hash no es BCrypt
     */
    public ServicioSesiones(PropiedadesSeguridad propiedades, Clock reloj) {
        this.propiedades = propiedades;
        this.reloj = reloj;
        if (propiedades.activa()) {
            if (propiedades.usuario().isEmpty()) {
                throw new IllegalStateException("Login activo sin usuario: defina APP_USUARIO "
                        + "(o APP_SEGURIDAD_ACTIVA=false solo en desarrollo)");
            }
            if (!FORMATO_BCRYPT.matcher(propiedades.claveHash()).matches()) {
                throw new IllegalStateException("APP_CLAVE_HASH no es un hash BCrypt valido. Generelo con "
                        + "GeneradorHashClave (ver paqtracker-infra/DESPLIEGUE-VM-PUCP.md)");
            }
        } else {
            LOGGER.warn("Login desactivado (paqtracker.seguridad.activa=false): la API no pide sesion");
        }
    }

    /**
     * @return si la API exige sesion
     */
    public boolean seguridadActiva() {
        return propiedades.activa();
    }

    /**
     * Comprueba las credenciales y, si coinciden, abre una sesion nueva.
     *
     * @param usuario nombre de la cuenta
     * @param clave   clave en claro
     * @return resultado del intento, con la sesion si fue correcto
     */
    public ResultadoInicio iniciar(String usuario, String clave) {
        Instant ahora = reloj.instant();
        synchronized (this) {
            if (ahora.isBefore(bloqueadoHasta)) {
                return ResultadoInicio.bloqueado(Duration.between(ahora, bloqueadoHasta));
            }
        }
        if (!credencialesCorrectas(usuario, clave)) {
            synchronized (this) {
                fallosSeguidos++;
                if (fallosSeguidos >= INTENTOS_ANTES_DE_BLOQUEO) {
                    fallosSeguidos = 0;
                    bloqueadoHasta = ahora.plus(DURACION_BLOQUEO);
                    LOGGER.warn("Login bloqueado {} s tras {} intentos fallidos", DURACION_BLOQUEO.toSeconds(),
                            INTENTOS_ANTES_DE_BLOQUEO);
                }
            }
            return ResultadoInicio.rechazado();
        }
        synchronized (this) {
            fallosSeguidos = 0;
        }
        descartarVencidas(ahora);
        String token = nuevoToken();
        Sesion sesion = new Sesion(token, propiedades.usuario(), ahora.plus(propiedades.duracionSesion()));
        sesiones.put(token, sesion);
        return ResultadoInicio.aceptado(sesion);
    }

    /**
     * @param token token recibido en la cabecera {@code Authorization}
     * @return la sesion si existe y no vencio
     */
    public Optional<Sesion> validar(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        Sesion sesion = sesiones.get(token);
        if (sesion == null) {
            return Optional.empty();
        }
        if (!reloj.instant().isBefore(sesion.expiraEn())) {
            sesiones.remove(token);
            return Optional.empty();
        }
        return Optional.of(sesion);
    }

    /**
     * Cierra la sesion; no hace nada si el token no existe.
     *
     * @param token token de la sesion
     */
    public void cerrar(String token) {
        if (token != null) {
            sesiones.remove(token);
        }
    }

    /**
     * Extrae el token de una cabecera {@code Authorization: Bearer <token>}.
     *
     * @param cabecera valor de la cabecera, puede ser null
     * @return el token, o null si la cabecera no tiene el formato
     */
    public static String tokenDe(String cabecera) {
        String prefijo = "Bearer ";
        if (cabecera == null || !cabecera.regionMatches(true, 0, prefijo, 0, prefijo.length())) {
            return null;
        }
        String token = cabecera.substring(prefijo.length()).trim();
        return token.isEmpty() ? null : token;
    }

    private boolean credencialesCorrectas(String usuario, String clave) {
        if (usuario == null || clave == null || propiedades.claveHash().isEmpty()) {
            return false;
        }
        boolean usuarioCoincide = MessageDigest.isEqual(
                usuario.trim().getBytes(StandardCharsets.UTF_8),
                propiedades.usuario().getBytes(StandardCharsets.UTF_8));
        // Siempre se calcula un BCrypt, coincida o no el usuario.
        boolean claveCoincide = cifrador.matches(clave, usuarioCoincide ? propiedades.claveHash() : hashRelleno);
        return usuarioCoincide && claveCoincide;
    }

    private void descartarVencidas(Instant ahora) {
        sesiones.values().removeIf(s -> !ahora.isBefore(s.expiraEn()));
    }

    private String nuevoToken() {
        byte[] bytes = new byte[BYTES_TOKEN];
        aleatorio.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Sesion abierta.
     *
     * @param token    identificador opaco que el cliente manda en cada solicitud
     * @param usuario  cuenta con la que se ingreso
     * @param expiraEn instante en que vence
     */
    public record Sesion(String token, String usuario, Instant expiraEn) {
    }

    /**
     * Resultado de un intento de login.
     *
     * @param sesion        sesion abierta, solo si fue aceptado
     * @param bloqueadoPor  tiempo que falta para poder reintentar, solo si esta bloqueado
     */
    public record ResultadoInicio(Sesion sesion, Duration bloqueadoPor) {

        static ResultadoInicio aceptado(Sesion sesion) {
            return new ResultadoInicio(sesion, null);
        }

        static ResultadoInicio rechazado() {
            return new ResultadoInicio(null, null);
        }

        static ResultadoInicio bloqueado(Duration restante) {
            return new ResultadoInicio(null, restante);
        }

        /**
         * @return si las credenciales fueron correctas
         */
        public boolean aceptado() {
            return sesion != null;
        }

        /**
         * @return si el login esta bloqueado por intentos fallidos
         */
        public boolean bloqueado() {
            return bloqueadoPor != null;
        }
    }
}
