package pe.pucp.paqtracker.planificador;

import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.planificador.comun.BusquedaLocal;
import pe.pucp.paqtracker.planificador.comun.ConstructorSoluciones;
import pe.pucp.paqtracker.planificador.comun.ContadorEvaluaciones;
import pe.pucp.paqtracker.planificador.comun.EvaluadorFitness;
import pe.pucp.paqtracker.planificador.comun.PesosFitness;
import pe.pucp.paqtracker.planificador.comun.Reparador;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Algoritmo genetico memetico para el planificador de rutas de PaqTracker.
 *
 * Combina una poblacion hibrida (parte golosa, parte aleatoria) con busqueda
 * local sobre cada individuo, lo que lo convierte en memetico. El elitismo
 * garantiza que la mejor solucion nunca empeore entre generaciones. Los bloques
 * de construccion, reparacion, busqueda local y fitness son compartidos con los
 * demas algoritmos; este planificador solo aporta los operadores geneticos y el
 * bucle evolutivo.
 */
public final class PlanificadorGA implements AlgoritmoMetaheuristico {

    /** Cantidad de individuos de la poblacion. */
    public static final int TAMANO_POBLACION = 50;

    /**
     * Numero de generaciones. El analisis de convergencia sobre el mes completo
     * mostro que el peor dia converge en 46 generaciones; se fija 70 como margen
     * del 50 por ciento sobre ese peor caso.
     */
    public static final int MAX_GENERACIONES = 70;

    /** Probabilidad de cruce entre dos progenitores. */
    public static final double PROBABILIDAD_CRUCE = 0.80;

    /** Probabilidad de mutacion del individuo generado. */
    public static final double PROBABILIDAD_MUTACION = 0.10;

    /** Fraccion de la poblacion que pasa intacta por elitismo. */
    public static final double FRACCION_ELITE = 0.05;

    /** Fraccion de la poblacion inicial construida de forma golosa. */
    public static final double FRACCION_GOLOSA = 0.60;

    /** Tamano del torneo de seleccion. */
    public static final int TAMANO_TORNEO = 5;

    private final long semilla;
    private final ParametrosGA parametros;
    private final PesosFitness pesos;

    /**
     * Crea el planificador con los parametros y pesos de produccion.
     *
     * @param semilla semilla del generador aleatorio, para reproducibilidad
     */
    public PlanificadorGA(long semilla) {
        this(semilla, ParametrosGA.porDefecto(), PesosFitness.porDefecto());
    }

    /**
     * Crea el planificador con parametros y pesos explicitos. Lo usa el
     * experimento numerico para barrer la calibracion sin recompilar.
     *
     * @param semilla    semilla del generador aleatorio, para reproducibilidad
     * @param parametros parametros del algoritmo genetico
     * @param pesos      pesos de la funcion objetivo
     */
    public PlanificadorGA(long semilla, ParametrosGA parametros, PesosFitness pesos) {
        this.semilla = semilla;
        this.parametros = parametros;
        this.pesos = pesos;
    }

    @Override
    public SolucionRuteo planificar(EscenarioOperativo escenario) {
        ContadorEvaluaciones.reiniciarCiclo();
        Reparador reparador = new Reparador(escenario);
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario, pesos);
        ConstructorSoluciones constructor = new ConstructorSoluciones(escenario, reparador, new Random(semilla));
        OperadoresGeneticos operadores = new OperadoresGeneticos(escenario, reparador, new Random(semilla));
        BusquedaLocal busquedaLocal = new BusquedaLocal();
        Random random = new Random(semilla);

        List<SolucionRuteo> poblacion = construirPoblacionInicial(
                constructor, reparador, busquedaLocal, evaluador);
        SolucionRuteo mejorGlobal = mejorDe(poblacion).copiar();

        int elite = Math.max(1,
                (int) Math.round(parametros.getTamanoPoblacion() * parametros.getFraccionElite()));
        for (int generacion = 0; generacion < parametros.getMaxGeneraciones(); generacion++) {
            if (ContadorEvaluaciones.presupuestoAgotado()) {
                break;
            }
            poblacion = evolucionar(poblacion, elite, operadores, reparador, busquedaLocal, evaluador, random);
            SolucionRuteo mejorGeneracion = mejorDe(poblacion);
            if (mejorGeneracion.getFitness() < mejorGlobal.getFitness()) {
                mejorGlobal = mejorGeneracion.copiar();
            }
        }
        return mejorGlobal;
    }

    /**
     * Construye la poblacion inicial hibrida y pule cada individuo con busqueda
     * local antes de evaluarlo.
     *
     * @param constructor   constructor de soluciones
     * @param reparador     reparador compartido
     * @param busquedaLocal busqueda local compartida
     * @param evaluador     evaluador de fitness
     * @return poblacion inicial evaluada
     */
    private List<SolucionRuteo> construirPoblacionInicial(ConstructorSoluciones constructor,
                                                          Reparador reparador,
                                                          BusquedaLocal busquedaLocal,
                                                          EvaluadorFitness evaluador) {
        List<SolucionRuteo> poblacion = new ArrayList<>();
        int golosos = (int) Math.round(
                parametros.getTamanoPoblacion() * parametros.getFraccionGolosa());
        for (int i = 0; i < parametros.getTamanoPoblacion(); i++) {
            SolucionRuteo individuo = (i < golosos)
                    ? constructor.construirGoloso()
                    : constructor.construirAleatorio();
            reparador.reparar(individuo);
            busquedaLocal.optimizar(individuo);
            reparador.reparar(individuo);
            evaluador.evaluar(individuo);
            poblacion.add(individuo);
        }
        return poblacion;
    }

    /**
     * Produce la siguiente generacion: conserva la elite y completa el resto con
     * cruce, mutacion, reparacion, busqueda local y evaluacion.
     *
     * @param poblacion     poblacion actual
     * @param elite         cantidad de individuos elite
     * @param operadores    operadores geneticos
     * @param reparador     reparador compartido
     * @param busquedaLocal busqueda local compartida
     * @param evaluador     evaluador de fitness
     * @param random        generador aleatorio
     * @return nueva generacion
     */
    private List<SolucionRuteo> evolucionar(List<SolucionRuteo> poblacion, int elite,
                                            OperadoresGeneticos operadores, Reparador reparador,
                                            BusquedaLocal busquedaLocal, EvaluadorFitness evaluador,
                                            Random random) {
        poblacion.sort(Comparator.comparingDouble(SolucionRuteo::getFitness));
        List<SolucionRuteo> nueva = new ArrayList<>();
        for (int i = 0; i < elite; i++) {
            nueva.add(poblacion.get(i).copiar());
        }
        int torneo = parametros.getTamanoTorneo();
        while (nueva.size() < parametros.getTamanoPoblacion()) {
            SolucionRuteo primero = operadores.seleccionarPorTorneo(poblacion, torneo);
            SolucionRuteo hijo = random.nextDouble() < parametros.getProbabilidadCruce()
                    ? operadores.cruzar(primero, operadores.seleccionarPorTorneo(poblacion, torneo))
                    : primero.copiar();
            if (random.nextDouble() < parametros.getProbabilidadMutacion()) {
                operadores.mutar(hijo);
            }
            reparador.reparar(hijo);
            busquedaLocal.optimizar(hijo);
            reparador.reparar(hijo);
            evaluador.evaluar(hijo);
            nueva.add(hijo);
        }
        return nueva;
    }

    /**
     * @param poblacion poblacion a inspeccionar
     * @return individuo de menor fitness
     */
    private SolucionRuteo mejorDe(List<SolucionRuteo> poblacion) {
        SolucionRuteo mejor = poblacion.get(0);
        for (SolucionRuteo individuo : poblacion) {
            if (individuo.getFitness() < mejor.getFitness()) {
                mejor = individuo;
            }
        }
        return mejor;
    }
}
