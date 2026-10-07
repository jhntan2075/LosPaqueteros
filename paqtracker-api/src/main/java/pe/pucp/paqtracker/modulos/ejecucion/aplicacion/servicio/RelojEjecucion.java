package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import java.time.Clock;
import java.time.Instant;

/**
 * Reloj simulado de una ejecucion: traduce el tiempo real transcurrido (descontando pausas) a minutos
 * simulados con el factor de aceleracion k. Con k = 1 es la operacion dia a dia en tiempo real.
 * Lo usa solo el hilo del motor de su ejecucion.
 */
public final class RelojEjecucion {

    private static final double MILISEGUNDOS_POR_MINUTO = 60_000.0;

    private final Clock relojPared;
    private final double minutoInicial;
    private final double factorAceleracion;
    private long milisegundosAcumulados;
    private long marcaReal;
    private boolean corriendo;
    private Instant inicioReal;

    /**
     * @param relojPared        reloj real
     * @param minutoInicial     minuto simulado en el que arranca
     * @param factorAceleracion factor k; minutos simulados por minuto real
     * @throws IllegalArgumentException si el factor no es positivo
     */
    public RelojEjecucion(Clock relojPared, double minutoInicial, double factorAceleracion) {
        if (factorAceleracion <= 0) {
            throw new IllegalArgumentException("El factor de aceleracion debe ser positivo: " + factorAceleracion);
        }
        this.relojPared = relojPared;
        this.minutoInicial = minutoInicial;
        this.factorAceleracion = factorAceleracion;
    }

    /**
     * Pone a correr el reloj, al iniciar o al reanudar. No hace nada si ya corre.
     */
    public void correr() {
        if (!corriendo) {
            marcaReal = relojPared.millis();
            corriendo = true;
            if (inicioReal == null) {
                inicioReal = relojPared.instant();
            }
        }
    }

    /**
     * @return instante real en que el reloj corrio por primera vez, o null si aun no corre
     */
    public Instant getInicioReal() {
        return inicioReal;
    }

    /**
     * Detiene el reloj conservando el tiempo transcurrido. No hace nada si ya esta detenido.
     */
    public void pausar() {
        if (corriendo) {
            milisegundosAcumulados += relojPared.millis() - marcaReal;
            corriendo = false;
        }
    }

    /**
     * @return minuto simulado actual, con fraccion
     */
    public double minutoActual() {
        long transcurrido = milisegundosAcumulados + (corriendo ? relojPared.millis() - marcaReal : 0);
        return minutoInicial + transcurrido * factorAceleracion / MILISEGUNDOS_POR_MINUTO;
    }

    public boolean estaCorriendo() {
        return corriendo;
    }

    public double getFactorAceleracion() {
        return factorAceleracion;
    }
}
