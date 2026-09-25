package pe.pucp.paqtracker.planificador;

/**
 * Parametros del algoritmo genetico, agrupados en un objeto inmutable para
 * poder barrerlos en tiempo de ejecucion durante la calibracion del experimento
 * numerico (etapa 2 del protocolo ISA).
 *
 * Los valores por defecto son exactamente las constantes publicas de
 * {@link PlanificadorGA}, de modo que el comportamiento no cambia mientras
 * nadie inyecte otros parametros.
 */
public final class ParametrosGA {

    private final int tamanoPoblacion;
    private final int maxGeneraciones;
    private final double probabilidadCruce;
    private final double probabilidadMutacion;
    private final double fraccionElite;
    private final double fraccionGolosa;
    private final int tamanoTorneo;

    /**
     * @param tamanoPoblacion      individuos de la poblacion
     * @param maxGeneraciones      generaciones del bucle evolutivo
     * @param probabilidadCruce    probabilidad de cruzar dos progenitores
     * @param probabilidadMutacion probabilidad de mutar el individuo generado
     * @param fraccionElite        fraccion que pasa intacta por elitismo
     * @param fraccionGolosa       fraccion de la poblacion inicial construida golosamente
     * @param tamanoTorneo         tamano del torneo de seleccion
     */
    public ParametrosGA(int tamanoPoblacion, int maxGeneraciones, double probabilidadCruce,
                        double probabilidadMutacion, double fraccionElite,
                        double fraccionGolosa, int tamanoTorneo) {
        this.tamanoPoblacion = tamanoPoblacion;
        this.maxGeneraciones = maxGeneraciones;
        this.probabilidadCruce = probabilidadCruce;
        this.probabilidadMutacion = probabilidadMutacion;
        this.fraccionElite = fraccionElite;
        this.fraccionGolosa = fraccionGolosa;
        this.tamanoTorneo = tamanoTorneo;
    }

    /**
     * @return parametros de produccion, iguales a las constantes de PlanificadorGA
     */
    public static ParametrosGA porDefecto() {
        return new ParametrosGA(
                PlanificadorGA.TAMANO_POBLACION,
                PlanificadorGA.MAX_GENERACIONES,
                PlanificadorGA.PROBABILIDAD_CRUCE,
                PlanificadorGA.PROBABILIDAD_MUTACION,
                PlanificadorGA.FRACCION_ELITE,
                PlanificadorGA.FRACCION_GOLOSA,
                PlanificadorGA.TAMANO_TORNEO);
    }

    public int getTamanoPoblacion() {
        return tamanoPoblacion;
    }

    public int getMaxGeneraciones() {
        return maxGeneraciones;
    }

    public double getProbabilidadCruce() {
        return probabilidadCruce;
    }

    public double getProbabilidadMutacion() {
        return probabilidadMutacion;
    }

    public double getFraccionElite() {
        return fraccionElite;
    }

    public double getFraccionGolosa() {
        return fraccionGolosa;
    }

    public int getTamanoTorneo() {
        return tamanoTorneo;
    }

    /**
     * @param valor nuevo tamano de poblacion
     * @return copia con el tamano de poblacion sustituido
     */
    public ParametrosGA conTamanoPoblacion(int valor) {
        return new ParametrosGA(valor, maxGeneraciones, probabilidadCruce, probabilidadMutacion,
                fraccionElite, fraccionGolosa, tamanoTorneo);
    }

    /**
     * @param valor nuevo numero de generaciones
     * @return copia con el maximo de generaciones sustituido
     */
    public ParametrosGA conMaxGeneraciones(int valor) {
        return new ParametrosGA(tamanoPoblacion, valor, probabilidadCruce, probabilidadMutacion,
                fraccionElite, fraccionGolosa, tamanoTorneo);
    }

    /**
     * @param valor nueva probabilidad de cruce
     * @return copia con la probabilidad de cruce sustituida
     */
    public ParametrosGA conProbabilidadCruce(double valor) {
        return new ParametrosGA(tamanoPoblacion, maxGeneraciones, valor, probabilidadMutacion,
                fraccionElite, fraccionGolosa, tamanoTorneo);
    }

    /**
     * @param valor nueva probabilidad de mutacion
     * @return copia con la probabilidad de mutacion sustituida
     */
    public ParametrosGA conProbabilidadMutacion(double valor) {
        return new ParametrosGA(tamanoPoblacion, maxGeneraciones, probabilidadCruce, valor,
                fraccionElite, fraccionGolosa, tamanoTorneo);
    }

    /**
     * @param valor nueva fraccion de elite
     * @return copia con la fraccion de elite sustituida
     */
    public ParametrosGA conFraccionElite(double valor) {
        return new ParametrosGA(tamanoPoblacion, maxGeneraciones, probabilidadCruce,
                probabilidadMutacion, valor, fraccionGolosa, tamanoTorneo);
    }

    /**
     * @param valor nueva fraccion golosa de la poblacion inicial
     * @return copia con la fraccion golosa sustituida
     */
    public ParametrosGA conFraccionGolosa(double valor) {
        return new ParametrosGA(tamanoPoblacion, maxGeneraciones, probabilidadCruce,
                probabilidadMutacion, fraccionElite, valor, tamanoTorneo);
    }

    /**
     * @param valor nuevo tamano de torneo
     * @return copia con el tamano de torneo sustituido
     */
    public ParametrosGA conTamanoTorneo(int valor) {
        return new ParametrosGA(tamanoPoblacion, maxGeneraciones, probabilidadCruce,
                probabilidadMutacion, fraccionElite, fraccionGolosa, valor);
    }

    @Override
    public String toString() {
        return String.format("poblacion=%d generaciones=%d cruce=%s mutacion=%s elite=%s"
                        + " golosa=%s torneo=%d", tamanoPoblacion, maxGeneraciones,
                probabilidadCruce, probabilidadMutacion, fraccionElite, fraccionGolosa, tamanoTorneo);
    }
}
