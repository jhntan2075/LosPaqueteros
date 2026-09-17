package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.ConfiguracionDominio;

/**
 * Aritmética de turnos y refrigerios.
 *
 * <p>Turnos de 8 h que arrancan a las 07:00, 15:00 y 23:00 (LE-023): la unidad debe
 * estar en un almacén al cambio de turno. El refrigerio dura 1 h y se escalona en
 * tres grupos a +3 h, +4 h y +5 h del inicio del turno, de modo que siempre queda a
 * más de una hora de los cambios (LE-024); mientras dura, la ruta se detiene.</p>
 */
public final class CalendarioOperativo {

    private final int[] turnos;
    private final int duracionTurno;
    private final int minutosRefrigerio;
    private final int desfaseRefrigerio;
    private final int pasoRefrigerio;
    private final int gruposRefrigerio;

    public CalendarioOperativo(ConfiguracionDominio cfg) {
        this.turnos = cfg.iniciosTurno();
        this.duracionTurno = cfg.duracionTurno();
        this.minutosRefrigerio = cfg.minutosRefrigerio();
        this.desfaseRefrigerio = cfg.desfaseRefrigerio();
        this.pasoRefrigerio = cfg.pasoRefrigerio();
        this.gruposRefrigerio = cfg.gruposRefrigerio();
    }

    /** Minuto en que comenzó el turno que contiene a {@code t}. */
    public double turnoInicio(double t) {
        double minutoDelDia = t % 1440;
        double base = t - minutoDelDia;
        int mejor = Integer.MIN_VALUE;
        for (int inicio : turnos) {
            if (inicio <= minutoDelDia && inicio > mejor) {
                mejor = inicio;
            }
        }
        if (mejor == Integer.MIN_VALUE) {
            // Antes del primer turno del día: seguimos en el turno nocturno del día anterior.
            return base - 1440 + turnos[turnos.length - 1];
        }
        return base + mejor;
    }

    public double turnoFin(double t) {
        return turnoInicio(t) + duracionTurno;
    }

    /** Minuto en que empieza el refrigerio de la unidad dentro del turno que contiene a {@code t}. */
    public double refrigerio(int indiceUnidad, double t) {
        return turnoInicio(t) + desfaseRefrigerio
                + (long) (indiceUnidad % gruposRefrigerio) * pasoRefrigerio;
    }

    /**
     * Avanza {@code duracion} minutos de trabajo efectivo desde {@code t}, saltando
     * el refrigerio de la unidad si cae dentro del tramo.
     */
    public double avanzar(int indiceUnidad, double t, double duracion) {
        double r = refrigerio(indiceUnidad, t);
        if (r <= t && t < r + minutosRefrigerio) {
            // Arrancamos dentro del refrigerio: se espera a que termine.
            t = r + minutosRefrigerio;
            if (t < turnoFin(r)) {
                r = refrigerio(indiceUnidad, t);
            }
        }
        if (t < r && r < t + duracion) {
            return t + duracion + minutosRefrigerio;
        }
        return t + duracion;
    }

    public int duracionTurno() {
        return duracionTurno;
    }

    public int minutosRefrigerio() {
        return minutosRefrigerio;
    }
}
