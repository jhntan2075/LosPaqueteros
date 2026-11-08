package pe.pucp.paqtracker.modulos.acceso.aplicacion;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import pe.pucp.paqtracker.modulos.acceso.aplicacion.ServicioSesiones.ResultadoInicio;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServicioSesionesTest {

    private static final String CLAVE = "clave-de-prueba";
    private static final String HASH = new BCryptPasswordEncoder().encode(CLAVE);

    /** Reloj que avanza a mano. */
    private static final class RelojManual extends Clock {
        private Instant ahora = Instant.parse("2026-11-08T12:00:00Z");

        void avanzar(Duration duracion) {
            ahora = ahora.plus(duracion);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }

    private final RelojManual reloj = new RelojManual();

    private ServicioSesiones servicio() {
        return new ServicioSesiones(new PropiedadesSeguridad(true, "operaciones", HASH, Duration.ofHours(12)), reloj);
    }

    @Test
    void credencialesCorrectas_abrenUnaSesionQueVenceALasDoceHoras() {
        ServicioSesiones servicio = servicio();
        ResultadoInicio resultado = servicio.iniciar(" operaciones ", CLAVE);

        assertTrue(resultado.aceptado());
        String token = resultado.sesion().token();
        assertTrue(servicio.validar(token).isPresent());

        reloj.avanzar(Duration.ofHours(12).minusSeconds(1));
        assertTrue(servicio.validar(token).isPresent());
        reloj.avanzar(Duration.ofSeconds(1));
        assertTrue(servicio.validar(token).isEmpty());
    }

    @Test
    void usuarioOClaveIncorrectos_seRechazan() {
        ServicioSesiones servicio = servicio();
        assertFalse(servicio.iniciar("otro", CLAVE).aceptado());
        assertFalse(servicio.iniciar("operaciones", "mala").aceptado());
        assertFalse(servicio.iniciar("Operaciones", CLAVE).aceptado());
    }

    @Test
    void cerrar_invalidaElToken() {
        ServicioSesiones servicio = servicio();
        String token = servicio.iniciar("operaciones", CLAVE).sesion().token();
        servicio.cerrar(token);
        assertTrue(servicio.validar(token).isEmpty());
    }

    @Test
    void cincoFallosSeguidos_bloqueanTreintaSegundosAunConLaClaveCorrecta() {
        ServicioSesiones servicio = servicio();
        for (int i = 0; i < ServicioSesiones.INTENTOS_ANTES_DE_BLOQUEO; i++) {
            assertFalse(servicio.iniciar("operaciones", "mala").bloqueado());
        }
        ResultadoInicio bloqueado = servicio.iniciar("operaciones", CLAVE);
        assertTrue(bloqueado.bloqueado());
        assertEquals(ServicioSesiones.DURACION_BLOQUEO, bloqueado.bloqueadoPor());

        reloj.avanzar(ServicioSesiones.DURACION_BLOQUEO);
        assertTrue(servicio.iniciar("operaciones", CLAVE).aceptado());
    }

    @Test
    void unAciertoReiniciaLaCuentaDeFallos() {
        ServicioSesiones servicio = servicio();
        for (int i = 0; i < ServicioSesiones.INTENTOS_ANTES_DE_BLOQUEO - 1; i++) {
            servicio.iniciar("operaciones", "mala");
        }
        assertTrue(servicio.iniciar("operaciones", CLAVE).aceptado());
        assertFalse(servicio.iniciar("operaciones", "mala").bloqueado());
        assertTrue(servicio.iniciar("operaciones", CLAVE).aceptado());
    }

    @Test
    void conSeguridadActiva_faltaUsuarioOHashInvalido_noArranca() {
        assertThrows(IllegalStateException.class,
                () -> new ServicioSesiones(new PropiedadesSeguridad(true, "", HASH, null), reloj));
        assertThrows(IllegalStateException.class,
                () -> new ServicioSesiones(new PropiedadesSeguridad(true, "operaciones", "clave-en-claro", null), reloj));
    }

    @Test
    void conSeguridadApagada_arrancaSinCuenta() {
        ServicioSesiones servicio = new ServicioSesiones(new PropiedadesSeguridad(false, null, null, null), reloj);
        assertFalse(servicio.seguridadActiva());
        assertFalse(servicio.iniciar("x", "y").aceptado());
    }

    @Test
    void tokenDe_leeSoloCabecerasBearer() {
        assertEquals("abc", ServicioSesiones.tokenDe("Bearer abc"));
        assertEquals("abc", ServicioSesiones.tokenDe("bearer  abc "));
        assertNull(ServicioSesiones.tokenDe("Basic abc"));
        assertNull(ServicioSesiones.tokenDe("Bearer "));
        assertNull(ServicioSesiones.tokenDe(null));
    }
}
