package pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import pe.pucp.paqtracker.planificador.AlgoritmoMetaheuristico;
import pe.pucp.paqtracker.planificador.MemoriaFeromonas;
import pe.pucp.paqtracker.planificador.ParametrosGA;
import pe.pucp.paqtracker.planificador.ParametrosIACO;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.planificador.PlanificadorIACO;
import pe.pucp.paqtracker.planificador.comun.ContadorEvaluaciones;
import pe.pucp.paqtracker.planificador.comun.PesosFitness;
import java.util.function.LongFunction;

/**
 * Crea la fabrica de algoritmos de una ejecucion. Los algoritmos no son beans: cada ciclo de
 * planificacion recibe una instancia nueva, sembrada con la semilla del ciclo.
 */
@Component
public class FabricaAlgoritmo {

    /**
     * El IACO recibe una sola memoria de feromonas para toda la ejecucion, de modo que el aprendizaje
     * persista entre ciclos. El contador de evaluaciones tambien es propio de la ejecucion.
     *
     * @param algoritmo metaheuristica elegida
     * @param contador  contador de evaluaciones de la ejecucion
     * @return fabrica que crea el algoritmo de cada ciclo a partir de su semilla
     */
    public LongFunction<AlgoritmoMetaheuristico> crear(AlgoritmoPlanificacion algoritmo,
                                                       ContadorEvaluaciones contador) {
        PesosFitness pesos = PesosFitness.porDefecto();
        if (algoritmo == AlgoritmoPlanificacion.IACO) {
            ParametrosIACO parametros = ParametrosIACO.porDefecto();
            MemoriaFeromonas memoria = PlanificadorIACO.crearMemoria(parametros);
            return semilla -> new PlanificadorIACO(semilla, memoria, parametros, pesos, contador);
        }
        ParametrosGA parametros = ParametrosGA.porDefecto();
        return semilla -> new PlanificadorGA(semilla, parametros, pesos, contador);
    }
}
