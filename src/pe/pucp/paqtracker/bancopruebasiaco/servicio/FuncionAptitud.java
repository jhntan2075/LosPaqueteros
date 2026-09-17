package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Pedido;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Ruta;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.SolucionRuteo;

/**
 * Función objetivo del planificador.
 *
 * <p>Combina costo de operación, una penalización cuadrática por incumplimiento
 * (entrega fuera de plazo o ruta que desborda el turno), un castigo blando por
 * entregar con poca holgura y otro por diferir pedidos de plazo corto.</p>
 *
 * <p>Además de la suma, deja registrados los incumplimientos y el atraso total para
 * que la IACO v3.0 pueda comparar soluciones de forma lexicográfica (M14): primero
 * cumplir, después reducir atraso y solo al final abaratar.</p>
 */
public final class FuncionAptitud {

    /** Pesos de la función objetivo. */
    public static final class Pesos {
        public double beta = 5000.0;    // incumplimientos (cuadrático)
        public double gamma = 50.0;     // pedidos diferidos
        public double delta = 20.0;     // holgura escasa
        public double umbral = 120.0;   // minutos por debajo de los cuales la holgura penaliza
        public boolean porCosto = false; // false: minimiza km; true: minimiza costo
        /**
         * M19 — penalización cuadrática por incumplimiento.
         *
         * <p>Con holgura es lo correcto: concentra los incumplimientos en pocas rutas
         * en vez de repartirlos. Pero cuando el sistema está saturado se vuelve en
         * contra: una ruta de 5 paradas tarde paga 25·β mientras que cinco rutas de una
         * parada pagan 5·β, o sea empuja a fragmentar justo cuando hace falta agrupar.
         * En saturación se pasa a penalización lineal.</p>
         */
        public boolean cuadratica = true;

        public Pesos copia() {
            Pesos w = new Pesos();
            w.beta = beta;
            w.gamma = gamma;
            w.delta = delta;
            w.umbral = umbral;
            w.porCosto = porCosto;
            w.cuadratica = cuadratica;
            return w;
        }

        public static Pesos v02() {
            return new Pesos();
        }

        public static Pesos v21() {
            Pesos w = new Pesos();
            w.porCosto = true;
            w.delta = 30.0;
            w.umbral = 90.0;
            return w;
        }
    }

    private final EvaluadorRuta evaluador;
    private final CalendarioOperativo calendario;

    public FuncionAptitud(EvaluadorRuta evaluador) {
        this.evaluador = evaluador;
        this.calendario = evaluador.calendario();
    }

    /** Evalúa la solución con cronograma Manhattan y deja el resultado en ella. */
    public double evaluar(SolucionRuteo s, Pesos w) {
        double f = 0.0;
        int incumplimientosTotales = 0;
        double atrasoTotal = 0.0;

        for (Ruta r : s.rutas()) {
            double atraso = evaluador.estimar(r);
            atrasoTotal += atraso;
            f += r.km() * (w.porCosto ? r.unidad().costoPorKm() : 1.0);

            int inc = 0;
            for (int i = 0; i < r.tamano(); i++) {
                if (r.minutoFinParada(i) > r.pedidos().get(i).minutoLimite()) {
                    inc++;
                }
            }
            if (r.minutoFin() > calendario.turnoFin(r.minutoSalida())) {
                inc++;
            }
            incumplimientosTotales += inc;
            f += w.beta * (w.cuadratica ? (double) inc * inc : inc)
                    + (w.porCosto ? atraso : 0.0);

            for (int i = 0; i < r.tamano(); i++) {
                double holgura = r.pedidos().get(i).minutoLimite() - r.minutoFinParada(i);
                if (holgura >= 0 && holgura < w.umbral) {
                    f += w.delta * (w.umbral - holgura) / 60.0;
                }
            }
        }

        for (Pedido p : s.diferidos()) {
            f += w.gamma * (36.0 / p.plazoHoras());
        }

        s.fijarAptitud(f, incumplimientosTotales, atrasoTotal);
        return f;
    }

    /** Costo local de una ruta, usado por los operadores de búsqueda local. */
    public double costoRuta(Ruta r, Pesos w) {
        double atraso = evaluador.estimar(r);
        int inc = 0;
        for (int i = 0; i < r.tamano(); i++) {
            if (r.minutoFinParada(i) > r.pedidos().get(i).minutoLimite()) {
                inc++;
            }
        }
        if (r.minutoFin() > calendario.turnoFin(r.minutoSalida())) {
            inc++;
        }
        return r.km() + w.beta * (w.cuadratica ? (double) inc * inc : inc) + atraso;
    }

    public EvaluadorRuta evaluador() {
        return evaluador;
    }
}
