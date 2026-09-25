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
 * El estado es estatico y global a propósito: la simulacion es monohilo y cada
 * corrida del experimento ocupa una JVM propia, de modo que enhebrar el
 * contador por toda la cadena de llamadas solo añadiria ruido. Fuera del
 * experimento el contador no se consulta y el tope queda en
 * {@link #SIN_PRESUPUESTO}, asi que no altera el comportamiento del sistema.
 */
public final class ContadorEvaluaciones {

    /** Valor que desactiva el tope: el planificador corre su ciclo completo. */
    public static final long SIN_PRESUPUESTO = Long.MAX_VALUE;

    private static long total;
    private static long delCiclo;
    private static long presupuestoPorCiclo = SIN_PRESUPUESTO;

    /**
     * Registra una evaluacion de la funcion objetivo. Lo invoca
     * {@link EvaluadorFitness#evaluar} y nadie mas.
     */
    public static void registrar() {
        total++;
        delCiclo++;
    }

    /**
     * Reinicia el conteo del ciclo en curso. Lo invoca cada algoritmo al
     * empezar a planificar, porque el presupuesto es por ciclo de
     * planificacion, no por simulacion completa.
     */
    public static void reiniciarCiclo() {
        delCiclo = 0;
    }

    /**
     * Deja el contador como recien creado: sin evaluaciones acumuladas y sin
     * tope. Pensado para las pruebas y para encadenar corridas en una misma JVM.
     */
    public static void reiniciarTodo() {
        total = 0;
        delCiclo = 0;
        presupuestoPorCiclo = SIN_PRESUPUESTO;
    }

    /**
     * Fija el tope de evaluaciones que puede gastar un ciclo de planificacion.
     *
     * @param evaluaciones tope por ciclo, o {@link #SIN_PRESUPUESTO} para no imponer ninguno
     * @throws IllegalArgumentException si el tope no es positivo
     */
    public static void fijarPresupuestoPorCiclo(long evaluaciones) {
        if (evaluaciones <= 0) {
            throw new IllegalArgumentException(
                    "El presupuesto por ciclo debe ser positivo: " + evaluaciones);
        }
        presupuestoPorCiclo = evaluaciones;
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
    public static boolean presupuestoAgotado() {
        return delCiclo >= presupuestoPorCiclo;
    }

    /**
     * @return evaluaciones acumuladas desde el ultimo reinicio total
     */
    public static long getTotal() {
        return total;
    }

    /**
     * @return evaluaciones gastadas por el ciclo de planificacion en curso
     */
    public static long getDelCiclo() {
        return delCiclo;
    }

    /**
     * @return tope vigente por ciclo, o {@link #SIN_PRESUPUESTO} si no hay
     */
    public static long getPresupuestoPorCiclo() {
        return presupuestoPorCiclo;
    }

    private ContadorEvaluaciones() {
    }
}
