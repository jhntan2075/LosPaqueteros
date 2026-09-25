package pe.pucp.paqtracker.planificador;

import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.planificador.comun.BusquedaLocal;
import pe.pucp.paqtracker.planificador.comun.ContadorEvaluaciones;
import pe.pucp.paqtracker.planificador.comun.EvaluadorFitness;
import pe.pucp.paqtracker.planificador.comun.PesosFitness;
import pe.pucp.paqtracker.planificador.comun.Reparador;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Colonia de hormigas mejorada (IACO) adaptada al contexto del planificador
 * comun. Toma la metaheuristica de iaco.servicio.PlanificadorIACO v3.0
 * (siembra por urgencia con feromona zona-tipo, lista de candidatos,
 * visibilidad con urgencia, feromona zonal persistente, MAX-MIN, holgura de
 * seguridad, regla q0 con evaporacion local, suavizado por convergencia y
 * hormiga codiciosa) y la hace operar sobre el mismo escenario, reparacion,
 * busqueda local y funcion de fitness que el algoritmo genetico, de modo que
 * ambos se comparen bajo los mismos parametros de negocio.
 *
 * Las diferencias con el IACO original estan documentadas en
 * docs/comparacion_ga_iaco.md.
 */
public final class PlanificadorIACO implements AlgoritmoMetaheuristico {

    /** Hormigas por iteracion. */
    public static final int HORMIGAS = 50;

    /** Iteraciones maximas de la colonia por ciclo. */
    public static final int ITERACIONES = 100;

    /** Peso de la feromona. */
    public static final double ALFA = 1.0;

    /** Peso de la visibilidad. */
    public static final double BETA = 3.0;

    /** Exponente de la urgencia en la visibilidad. */
    public static final double GAMMA = 1.0;

    /** Tasa de evaporacion global. */
    public static final double RHO = 0.30;

    /** Hormigas que depositan feromona en cada iteracion. */
    public static final int ELITE = 10;

    /** Cota inferior de los rastros. */
    public static final double TAU_MIN = 0.05;

    /** Cota superior de los rastros. */
    public static final double TAU_MAX = 1.0;

    /** Tamano de la lista de candidatos. */
    public static final int CANDIDATOS = 3;

    /** Mejores hormigas de cada iteracion que reciben busqueda local. */
    public static final int BUSQUEDA_LOCAL_TOP = 4;

    /** Probabilidad de la eleccion determinista (regla ACS). */
    public static final double Q0 = 0.35;

    /** Intensidad de la evaporacion local. */
    public static final double XI_LOCAL = 0.10;

    /** Iteraciones sin mejora antes de un reinicio parcial. */
    public static final int ESTANCAMIENTO = 4;

    /** Iteraciones sin mejora antes de cortar la colonia. */
    public static final int PARADA = 6;

    /** Factor de convergencia a partir del cual se suavizan los rastros. */
    public static final double UMBRAL_CONVERGENCIA = 0.92;

    /** Iteraciones iniciales en que el factor de convergencia no se consulta. */
    public static final int ITERACIONES_SIN_SUAVIZADO = 5;

    /** Fraccion del suavizado hacia tauMax. */
    public static final double FRACCION_SUAVIZADO = 0.5;

    /** Holgura de seguridad, en minutos, exigida al construir. */
    public static final int BUFFER_MINUTOS = 45;

    private final long semilla;
    private final MemoriaFeromonas memoria;
    private final ParametrosIACO parametros;
    private final PesosFitness pesos;

    /**
     * Crea el planificador con los parametros y pesos de produccion.
     *
     * @param semilla semilla del ciclo, para reproducibilidad
     * @param memoria memoria de feromonas compartida por toda la simulacion
     */
    public PlanificadorIACO(long semilla, MemoriaFeromonas memoria) {
        this(semilla, memoria, ParametrosIACO.porDefecto(), PesosFitness.porDefecto());
    }

    /**
     * Crea el planificador con parametros y pesos explicitos. Lo usa el
     * experimento numerico para barrer la calibracion sin recompilar.
     *
     * @param semilla    semilla del ciclo, para reproducibilidad
     * @param memoria    memoria de feromonas compartida por toda la simulacion
     * @param parametros parametros de la colonia
     * @param pesos      pesos de la funcion objetivo
     */
    public PlanificadorIACO(long semilla, MemoriaFeromonas memoria,
                            ParametrosIACO parametros, PesosFitness pesos) {
        this.semilla = semilla;
        this.memoria = memoria;
        this.parametros = parametros;
        this.pesos = pesos;
    }

    /**
     * @return memoria nueva con los limites MAX-MIN del planificador
     */
    public static MemoriaFeromonas crearMemoria() {
        return new MemoriaFeromonas(TAU_MIN, TAU_MAX);
    }

    /**
     * Crea la memoria de feromonas con los limites MAX-MIN de unos parametros
     * dados, para los barridos que mueven tauMin o tauMax.
     *
     * @param parametros parametros de la colonia
     * @return memoria nueva con los limites indicados
     */
    public static MemoriaFeromonas crearMemoria(ParametrosIACO parametros) {
        return new MemoriaFeromonas(parametros.getTauMin(), parametros.getTauMax());
    }

    @Override
    public SolucionRuteo planificar(EscenarioOperativo escenario) {
        ContadorEvaluaciones.reiniciarCiclo();
        Reparador reparador = new Reparador(escenario);
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario, pesos);
        BusquedaLocal busquedaLocal = new BusquedaLocal();
        OperadoresColonia operadores = new OperadoresColonia(escenario, memoria);

        SolucionRuteo mejor = null;
        int sinMejora = 0;
        for (int iteracion = 0; iteracion < parametros.getIteraciones(); iteracion++) {
            if (mejor != null && ContadorEvaluaciones.presupuestoAgotado()) {
                break;
            }
            List<SolucionRuteo> colonia = construirColonia(iteracion, operadores, reparador, evaluador);
            colonia.sort(Comparator.comparingDouble(SolucionRuteo::getFitness));
            int tope = Math.min(parametros.getBusquedaLocalTop(), colonia.size());
            for (int i = 0; i < tope; i++) {
                SolucionRuteo hormiga = colonia.get(i);
                reparador.reparar(hormiga);
                busquedaLocal.optimizar(hormiga);
                reparador.reparar(hormiga);
                evaluador.evaluar(hormiga);
            }
            colonia.sort(Comparator.comparingDouble(SolucionRuteo::getFitness));

            SolucionRuteo lider = colonia.get(0);
            if (mejor == null || lider.getFitness() < mejor.getFitness()) {
                mejor = lider.copiar();
                sinMejora = 0;
            } else {
                sinMejora++;
            }
            actualizarFeromonas(colonia, mejor, operadores);

            if (sinMejora >= parametros.getParada()) {
                break;
            }
            if (iteracion >= parametros.getIteracionesSinSuavizado()
                    && memoria.factorConvergencia() > parametros.getUmbralConvergencia()) {
                memoria.suavizar(parametros.getFraccionSuavizado());
            }
            if (sinMejora >= parametros.getEstancamiento()) {
                memoria.suavizar(parametros.getFraccionSuavizado());
                sinMejora = 0;
            }
        }
        return mejor;
    }

    /**
     * Construye, repara y evalua las hormigas de una iteracion, y aplica la
     * evaporacion local en orden de hormiga para que el resultado sea
     * reproducible.
     *
     * @param iteracion  numero de iteracion
     * @param operadores operadores de la colonia
     * @param reparador  reparador compartido
     * @param evaluador  evaluador de fitness compartido
     * @return hormigas evaluadas
     */
    private List<SolucionRuteo> construirColonia(int iteracion, OperadoresColonia operadores,
                                                 Reparador reparador, EvaluadorFitness evaluador) {
        List<SolucionRuteo> colonia = new ArrayList<>();
        for (int hormiga = 0; hormiga < parametros.getHormigas(); hormiga++) {
            Random random = new Random(semilla * 1_000_003L + iteracion * 131L + hormiga);
            double q0 = hormiga == 0 ? 1.0 : parametros.getQ0();
            SolucionRuteo solucion = operadores.construir(random, q0, parametros.getAlfa(),
                    parametros.getBeta(), parametros.getGamma(),
                    parametros.getCandidatos(), parametros.getBufferMinutos());
            reparador.reparar(solucion);
            evaluador.evaluar(solucion);
            operadores.evaporarLocal(solucion, parametros.getXiLocal());
            colonia.add(solucion);
        }
        return colonia;
    }

    /**
     * Evaporacion global y deposito por rango: las hormigas elite depositan en
     * proporcion a su posicion y a su fitness relativo, y la mejor global
     * refuerza siempre sus rastros.
     *
     * @param colonia    hormigas ordenadas por fitness
     * @param mejor      mejor solucion encontrada en el ciclo
     * @param operadores operadores de la colonia
     */
    private void actualizarFeromonas(List<SolucionRuteo> colonia, SolucionRuteo mejor,
                                     OperadoresColonia operadores) {
        double rho = parametros.getRho();
        memoria.evaporar(rho);
        int elite = Math.min(parametros.getElite(), colonia.size());
        for (int rango = 1; rango <= elite; rango++) {
            SolucionRuteo hormiga = colonia.get(rango - 1);
            double peso = rho * (elite - rango + 1) / elite
                    * (mejor.getFitness() / Math.max(hormiga.getFitness(), 1e-9));
            operadores.depositar(hormiga, peso);
        }
        operadores.depositar(mejor, rho);
    }
}
