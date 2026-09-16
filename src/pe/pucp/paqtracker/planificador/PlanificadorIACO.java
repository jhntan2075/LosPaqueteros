package pe.pucp.paqtracker.planificador;

import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.planificador.comun.BusquedaLocal;
import pe.pucp.paqtracker.planificador.comun.EvaluadorFitness;
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
    public static final int HORMIGAS = 20;

    /** Iteraciones maximas de la colonia por ciclo. */
    public static final int ITERACIONES = 30;

    /** Peso de la feromona. */
    public static final double ALFA = 1.0;

    /** Peso de la visibilidad. */
    public static final double BETA = 2.0;

    /** Exponente de la urgencia en la visibilidad. */
    public static final double GAMMA = 1.0;

    /** Tasa de evaporacion global. */
    public static final double RHO = 0.10;

    /** Hormigas que depositan feromona en cada iteracion. */
    public static final int ELITE = 5;

    /** Cota inferior de los rastros. */
    public static final double TAU_MIN = 0.05;

    /** Cota superior de los rastros. */
    public static final double TAU_MAX = 1.0;

    /** Tamano de la lista de candidatos. */
    public static final int CANDIDATOS = 12;

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

    /**
     * @param semilla semilla del ciclo, para reproducibilidad
     * @param memoria memoria de feromonas compartida por toda la simulacion
     */
    public PlanificadorIACO(long semilla, MemoriaFeromonas memoria) {
        this.semilla = semilla;
        this.memoria = memoria;
    }

    /**
     * @return memoria nueva con los limites MAX-MIN del planificador
     */
    public static MemoriaFeromonas crearMemoria() {
        return new MemoriaFeromonas(TAU_MIN, TAU_MAX);
    }

    @Override
    public SolucionRuteo planificar(EscenarioOperativo escenario) {
        Reparador reparador = new Reparador(escenario);
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario);
        BusquedaLocal busquedaLocal = new BusquedaLocal();
        OperadoresColonia operadores = new OperadoresColonia(escenario, memoria);

        SolucionRuteo mejor = null;
        int sinMejora = 0;
        for (int iteracion = 0; iteracion < ITERACIONES; iteracion++) {
            List<SolucionRuteo> colonia = construirColonia(iteracion, operadores, reparador, evaluador);
            colonia.sort(Comparator.comparingDouble(SolucionRuteo::getFitness));
            int tope = Math.min(BUSQUEDA_LOCAL_TOP, colonia.size());
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

            if (sinMejora >= PARADA) {
                break;
            }
            if (iteracion >= ITERACIONES_SIN_SUAVIZADO
                    && memoria.factorConvergencia() > UMBRAL_CONVERGENCIA) {
                memoria.suavizar(FRACCION_SUAVIZADO);
            }
            if (sinMejora >= ESTANCAMIENTO) {
                memoria.suavizar(FRACCION_SUAVIZADO);
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
        for (int hormiga = 0; hormiga < HORMIGAS; hormiga++) {
            Random random = new Random(semilla * 1_000_003L + iteracion * 131L + hormiga);
            double q0 = hormiga == 0 ? 1.0 : Q0;
            SolucionRuteo solucion = operadores.construir(random, q0, ALFA, BETA, GAMMA,
                    CANDIDATOS, BUFFER_MINUTOS);
            reparador.reparar(solucion);
            evaluador.evaluar(solucion);
            operadores.evaporarLocal(solucion, XI_LOCAL);
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
        memoria.evaporar(RHO);
        int elite = Math.min(ELITE, colonia.size());
        for (int rango = 1; rango <= elite; rango++) {
            SolucionRuteo hormiga = colonia.get(rango - 1);
            double peso = RHO * (elite - rango + 1) / elite
                    * (mejor.getFitness() / Math.max(hormiga.getFitness(), 1e-9));
            operadores.depositar(hormiga, peso);
        }
        operadores.depositar(mejor, RHO);
    }
}
