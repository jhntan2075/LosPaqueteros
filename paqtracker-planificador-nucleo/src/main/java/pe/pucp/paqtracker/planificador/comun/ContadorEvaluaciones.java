package pe.pucp.paqtracker.planificador.comun;

/**
 * Instrumentacion del presupuesto de computo del experimento numerico: cuenta
 * cuantas veces se evaluo la funcion objetivo y permite imponer un tope por
 * ciclo de planificacion.
 *
 * El diseño experimental exige que GA e IACO compitan con el mismo presupuesto
 * expresado en evaluaciones de la funcion objetivo, no en tiempo de pared,
 * porque el tiempo depende del hardware y de la eficiencia de implementacion de
 * cada pareja. Sin este contador el presupuesto es implicito y desigual: el GA
 * gasta TAMANO_POBLACION * (MAX_GENERACIONES + 1) evaluaciones fijas y el IACO
 * hasta HORMIGAS * ITERACIONES, con parada temprana variable.
 *
 * Cada simulacion usa su propia instancia y la comparte entre los planificadores
 * de todos sus ciclos: la API corre varias ejecuciones a la vez en hilos
 * distintos, asi que un contador global mezclaria sus conteos. Fuera del
 * experimento el tope queda en {@link #SIN_PRESUPUESTO} y no altera el
 * comportamiento del sistema.
 */
public final class ContadorEvaluaciones {

    /** Valor que desactiva el tope: el planificador corre su ciclo completo. */
    public static final long SIN_PRESUPUESTO = Long.MAX_VALUE;

    private final long presupuestoPorCiclo;
    private long total;
    private long delCiclo;

    /**
     * Crea un contador sin tope por ciclo.
     */
    public ContadorEvaluaciones() {
        this(SIN_PRESUPUESTO);
    }

    /**
     * Crea un contador con un tope de evaluaciones por ciclo de planificacion.
     *
     * @param presupuestoPorCiclo tope por ciclo, o {@link #SIN_PRESUPUESTO} para no imponer ninguno
     * @throws IllegalArgumentException si el tope no es positivo
     */
    public ContadorEvaluaciones(long presupuestoPorCiclo) {
        if (presupuestoPorCiclo <= 0) {
            throw new IllegalArgumentException(
                    "El presupuesto por ciclo debe ser positivo: " + presupuestoPorCiclo);
        }
        this.presupuestoPorCiclo = presupuestoPorCiclo;
    }

    /**
     * Registra una evaluacion de la funcion objetivo. Lo invoca
     * {@link EvaluadorFitness#evaluar} y nadie mas.
     */
    public void registrar() {
        total++;
        delCiclo++;
    }

    /**
     * Reinicia el conteo del ciclo en curso. Lo invoca cada algoritmo al
     * empezar a planificar, porque el presupuesto es por ciclo de
     * planificacion, no por simulacion completa.
     */
    public void reiniciarCiclo() {
        delCiclo = 0;
    }

    /**
     * Indica si el ciclo en curso ya agoto su presupuesto. Los algoritmos lo
     * consultan al inicio de cada generacion (GA) y de cada iteracion (IACO),
     * de modo que el gasto real puede superar el tope por lo que cueste el
     * lote en curso: hasta una poblacion en el GA y hasta una colonia en el
     * IACO. Pendiente de validar si esa granularidad basta para el experimento.
     *
     * @return verdadero si el ciclo en curso ya agoto su presupuesto
     */
    public boolean presupuestoAgotado() {
        return delCiclo >= presupuestoPorCiclo;
    }

    /**
     * @return evaluaciones acumuladas desde que se creo el contador
     */
    public long getTotal() {
        return total;
    }

    /**
     * @return evaluaciones gastadas por el ciclo de planificacion en curso
     */
    public long getDelCiclo() {
        return delCiclo;
    }

    /**
     * @return tope vigente por ciclo, o {@link #SIN_PRESUPUESTO} si no hay
     */
    public long getPresupuestoPorCiclo() {
        return presupuestoPorCiclo;
    }
}
