package pe.pucp.paqtracker.soporte;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

/**
 * Reloj de pared que solo avanza cuando la prueba lo pide.
 */
public final class RelojControlable extends Clock {

    private final ZoneId zona;
    private volatile Instant ahora;

    /**
     * @param inicio instante inicial
     * @param zona   zona horaria
     */
    public RelojControlable(Instant inicio, ZoneId zona) {
        this.ahora = inicio;
        this.zona = zona;
    }

    /**
     * @param duracion tiempo real que avanza el reloj
     */
    public void avanzar(Duration duracion) {
        ahora = ahora.plus(duracion);
    }

    @Override
    public ZoneId getZone() {
        return zona;
    }

    @Override
    public Clock withZone(ZoneId otraZona) {
        return new RelojControlable(ahora, otraZona);
    }

    @Override
    public Instant instant() {
        return ahora;
    }
}
