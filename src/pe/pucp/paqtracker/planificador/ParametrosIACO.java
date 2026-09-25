package pe.pucp.paqtracker.planificador;

/**
 * Parametros de la colonia de hormigas mejorada, agrupados en un objeto
 * inmutable para poder barrerlos en tiempo de ejecucion durante la calibracion
 * del experimento numerico (etapa 2 del protocolo ISA).
 *
 * Los valores por defecto son exactamente las constantes publicas de
 * {@link PlanificadorIACO}, de modo que el comportamiento no cambia mientras
 * nadie inyecte otros parametros. Como son muchos y casi siempre se varia uno a
 * la vez, el constructor completo es privado y la forma de uso es partir de
 * {@link #porDefecto()} y encadenar los metodos {@code con...}.
 *
 * No existe una constante Q de deposito como la del ACO clasico: este IACO
 * deposita por rango de hormiga ponderado por el fitness relativo, de modo que
 * el barrido de Q previsto en el diseño no tiene contraparte aqui. Su lugar lo
 * ocupan {@link #getElite()} y {@link #getRho()}.
 */
public final class ParametrosIACO {

    private final int hormigas;
    private final int iteraciones;
    private final double alfa;
    private final double beta;
    private final double gamma;
    private final double rho;
    private final int elite;
    private final double tauMin;
    private final double tauMax;
    private final int candidatos;
    private final int busquedaLocalTop;
    private final double q0;
    private final double xiLocal;
    private final int estancamiento;
    private final int parada;
    private final double umbralConvergencia;
    private final int iteracionesSinSuavizado;
    private final double fraccionSuavizado;
    private final int bufferMinutos;

    private ParametrosIACO(int hormigas, int iteraciones, double alfa, double beta, double gamma,
                           double rho, int elite, double tauMin, double tauMax, int candidatos,
                           int busquedaLocalTop, double q0, double xiLocal, int estancamiento,
                           int parada, double umbralConvergencia, int iteracionesSinSuavizado,
                           double fraccionSuavizado, int bufferMinutos) {
        this.hormigas = hormigas;
        this.iteraciones = iteraciones;
        this.alfa = alfa;
        this.beta = beta;
        this.gamma = gamma;
        this.rho = rho;
        this.elite = elite;
        this.tauMin = tauMin;
        this.tauMax = tauMax;
        this.candidatos = candidatos;
        this.busquedaLocalTop = busquedaLocalTop;
        this.q0 = q0;
        this.xiLocal = xiLocal;
        this.estancamiento = estancamiento;
        this.parada = parada;
        this.umbralConvergencia = umbralConvergencia;
        this.iteracionesSinSuavizado = iteracionesSinSuavizado;
        this.fraccionSuavizado = fraccionSuavizado;
        this.bufferMinutos = bufferMinutos;
    }

    /**
     * @return parametros de produccion, iguales a las constantes de PlanificadorIACO
     */
    public static ParametrosIACO porDefecto() {
        return new ParametrosIACO(
                PlanificadorIACO.HORMIGAS,
                PlanificadorIACO.ITERACIONES,
                PlanificadorIACO.ALFA,
                PlanificadorIACO.BETA,
                PlanificadorIACO.GAMMA,
                PlanificadorIACO.RHO,
                PlanificadorIACO.ELITE,
                PlanificadorIACO.TAU_MIN,
                PlanificadorIACO.TAU_MAX,
                PlanificadorIACO.CANDIDATOS,
                PlanificadorIACO.BUSQUEDA_LOCAL_TOP,
                PlanificadorIACO.Q0,
                PlanificadorIACO.XI_LOCAL,
                PlanificadorIACO.ESTANCAMIENTO,
                PlanificadorIACO.PARADA,
                PlanificadorIACO.UMBRAL_CONVERGENCIA,
                PlanificadorIACO.ITERACIONES_SIN_SUAVIZADO,
                PlanificadorIACO.FRACCION_SUAVIZADO,
                PlanificadorIACO.BUFFER_MINUTOS);
    }

    public int getHormigas() {
        return hormigas;
    }

    public int getIteraciones() {
        return iteraciones;
    }

    public double getAlfa() {
        return alfa;
    }

    public double getBeta() {
        return beta;
    }

    public double getGamma() {
        return gamma;
    }

    public double getRho() {
        return rho;
    }

    public int getElite() {
        return elite;
    }

    public double getTauMin() {
        return tauMin;
    }

    public double getTauMax() {
        return tauMax;
    }

    public int getCandidatos() {
        return candidatos;
    }

    public int getBusquedaLocalTop() {
        return busquedaLocalTop;
    }

    public double getQ0() {
        return q0;
    }

    public double getXiLocal() {
        return xiLocal;
    }

    public int getEstancamiento() {
        return estancamiento;
    }

    public int getParada() {
        return parada;
    }

    public double getUmbralConvergencia() {
        return umbralConvergencia;
    }

    public int getIteracionesSinSuavizado() {
        return iteracionesSinSuavizado;
    }

    public double getFraccionSuavizado() {
        return fraccionSuavizado;
    }

    public int getBufferMinutos() {
        return bufferMinutos;
    }

    /**
     * @param valor nuevo numero de hormigas por iteracion
     * @return copia con el numero de hormigas sustituido
     */
    public ParametrosIACO conHormigas(int valor) {
        return new ParametrosIACO(valor, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevo maximo de iteraciones de la colonia
     * @return copia con el numero de iteraciones sustituido
     */
    public ParametrosIACO conIteraciones(int valor) {
        return new ParametrosIACO(hormigas, valor, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevo peso alfa de la feromona
     * @return copia con alfa sustituido
     */
    public ParametrosIACO conAlfa(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, valor, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevo peso beta de la visibilidad
     * @return copia con beta sustituido
     */
    public ParametrosIACO conBeta(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, valor, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevo exponente gamma de la urgencia
     * @return copia con gamma sustituido
     */
    public ParametrosIACO conGamma(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, valor, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nueva tasa de evaporacion global
     * @return copia con rho sustituido
     */
    public ParametrosIACO conRho(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, valor, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevo numero de hormigas que depositan feromona
     * @return copia con el tamano de la elite sustituido
     */
    public ParametrosIACO conElite(int valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, valor, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nueva cota inferior de los rastros
     * @return copia con tauMin sustituido
     */
    public ParametrosIACO conTauMin(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, valor,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nueva cota superior de los rastros
     * @return copia con tauMax sustituido
     */
    public ParametrosIACO conTauMax(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                valor, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevo tamano de la lista de candidatos
     * @return copia con el numero de candidatos sustituido
     */
    public ParametrosIACO conCandidatos(int valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, valor, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevo numero de hormigas que reciben busqueda local
     * @return copia con el tope de busqueda local sustituido
     */
    public ParametrosIACO conBusquedaLocalTop(int valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, valor, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nueva probabilidad de eleccion determinista
     * @return copia con q0 sustituido
     */
    public ParametrosIACO conQ0(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, valor, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nueva intensidad de la evaporacion local
     * @return copia con xi sustituido
     */
    public ParametrosIACO conXiLocal(double valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, valor, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevas iteraciones sin mejora antes de un reinicio parcial
     * @return copia con el estancamiento sustituido
     */
    public ParametrosIACO conEstancamiento(int valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, valor, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nuevas iteraciones sin mejora antes de cortar la colonia
     * @return copia con la parada sustituida
     */
    public ParametrosIACO conParada(int valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, valor,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, bufferMinutos);
    }

    /**
     * @param valor nueva holgura de seguridad en minutos exigida al construir
     * @return copia con el buffer sustituido
     */
    public ParametrosIACO conBufferMinutos(int valor) {
        return new ParametrosIACO(hormigas, iteraciones, alfa, beta, gamma, rho, elite, tauMin,
                tauMax, candidatos, busquedaLocalTop, q0, xiLocal, estancamiento, parada,
                umbralConvergencia, iteracionesSinSuavizado, fraccionSuavizado, valor);
    }

    @Override
    public String toString() {
        return String.format("hormigas=%d iteraciones=%d alfa=%s beta=%s gamma=%s rho=%s"
                        + " elite=%d q0=%s buffer=%d", hormigas, iteraciones, alfa, beta, gamma,
                rho, elite, q0, bufferMinutos);
    }
}
