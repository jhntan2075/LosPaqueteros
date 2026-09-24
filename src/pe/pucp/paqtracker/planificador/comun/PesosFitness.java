package pe.pucp.paqtracker.planificador.comun;

/**
 * Pesos de la funcion objetivo, agrupados en un objeto inmutable para poder
 * variarlos en tiempo de ejecucion durante la calibracion del experimento
 * numerico (etapa 1 del protocolo ISA), sin recompilar ni tocar el evaluador.
 *
 * Los valores por defecto son exactamente las constantes publicas de
 * {@link EvaluadorFitness}, de modo que el comportamiento del planificador no
 * cambia mientras nadie inyecte otros pesos.
 *
 * Simbolos del documento de diseño:
 *   U = umbralHolguraMinutos
 *   A = factorHolguraBlanda
 *   H = penalizacionTardanzaBase
 *   B = penalizacionPorMinutoTarde
 *   C = penalizacionSinRutearBase
 *   W = pesoEspera
 */
public final class PesosFitness {

    private final int umbralHolguraMinutos;
    private final double factorHolguraBlanda;
    private final double penalizacionTardanzaBase;
    private final double penalizacionPorMinutoTarde;
    private final double penalizacionSinRutearBase;
    private final double pesoEspera;

    /**
     * @param umbralHolguraMinutos       U, margen protegido en minutos
     * @param factorHolguraBlanda        A, coeficiente de la rama blanda
     * @param penalizacionTardanzaBase   H, salto fijo al incumplir el plazo
     * @param penalizacionPorMinutoTarde B, costo por minuto de retraso
     * @param penalizacionSinRutearBase  C, piso por abandonar una entrega
     * @param pesoEspera                 W, urgencia en la cola de espera
     */
    public PesosFitness(int umbralHolguraMinutos, double factorHolguraBlanda,
                        double penalizacionTardanzaBase, double penalizacionPorMinutoTarde,
                        double penalizacionSinRutearBase, double pesoEspera) {
        this.umbralHolguraMinutos = umbralHolguraMinutos;
        this.factorHolguraBlanda = factorHolguraBlanda;
        this.penalizacionTardanzaBase = penalizacionTardanzaBase;
        this.penalizacionPorMinutoTarde = penalizacionPorMinutoTarde;
        this.penalizacionSinRutearBase = penalizacionSinRutearBase;
        this.pesoEspera = pesoEspera;
    }

    /**
     * @return pesos de produccion, iguales a las constantes de EvaluadorFitness
     */
    public static PesosFitness porDefecto() {
        return new PesosFitness(
                EvaluadorFitness.UMBRAL_HOLGURA_MINUTOS,
                EvaluadorFitness.FACTOR_HOLGURA_BLANDA,
                EvaluadorFitness.PENALIZACION_TARDANZA_BASE,
                EvaluadorFitness.PENALIZACION_POR_MINUTO_TARDE,
                EvaluadorFitness.PENALIZACION_SIN_RUTEAR_BASE,
                EvaluadorFitness.PESO_ESPERA);
    }

    public int getUmbralHolguraMinutos() {
        return umbralHolguraMinutos;
    }

    public double getFactorHolguraBlanda() {
        return factorHolguraBlanda;
    }

    public double getPenalizacionTardanzaBase() {
        return penalizacionTardanzaBase;
    }

    public double getPenalizacionPorMinutoTarde() {
        return penalizacionPorMinutoTarde;
    }

    public double getPenalizacionSinRutearBase() {
        return penalizacionSinRutearBase;
    }

    public double getPesoEspera() {
        return pesoEspera;
    }

    /**
     * Devuelve una copia con el umbral U cambiado, para los barridos de un peso
     * a la vez de la etapa 1.
     *
     * @param valor nuevo umbral de holgura en minutos
     * @return pesos con el umbral sustituido
     */
    public PesosFitness conUmbralHolgura(int valor) {
        return new PesosFitness(valor, factorHolguraBlanda, penalizacionTardanzaBase,
                penalizacionPorMinutoTarde, penalizacionSinRutearBase, pesoEspera);
    }

    /**
     * @param valor nuevo coeficiente A de la rama blanda
     * @return pesos con el factor de holgura blanda sustituido
     */
    public PesosFitness conFactorHolguraBlanda(double valor) {
        return new PesosFitness(umbralHolguraMinutos, valor, penalizacionTardanzaBase,
                penalizacionPorMinutoTarde, penalizacionSinRutearBase, pesoEspera);
    }

    /**
     * @param valor nuevo salto fijo H al incumplir el plazo
     * @return pesos con la penalizacion de tardanza base sustituida
     */
    public PesosFitness conPenalizacionTardanzaBase(double valor) {
        return new PesosFitness(umbralHolguraMinutos, factorHolguraBlanda, valor,
                penalizacionPorMinutoTarde, penalizacionSinRutearBase, pesoEspera);
    }

    /**
     * @param valor nuevo costo B por minuto de retraso
     * @return pesos con la penalizacion por minuto tarde sustituida
     */
    public PesosFitness conPenalizacionPorMinutoTarde(double valor) {
        return new PesosFitness(umbralHolguraMinutos, factorHolguraBlanda, penalizacionTardanzaBase,
                valor, penalizacionSinRutearBase, pesoEspera);
    }

    /**
     * @param valor nuevo piso C por abandonar una entrega
     * @return pesos con la penalizacion sin rutear base sustituida
     */
    public PesosFitness conPenalizacionSinRutearBase(double valor) {
        return new PesosFitness(umbralHolguraMinutos, factorHolguraBlanda, penalizacionTardanzaBase,
                penalizacionPorMinutoTarde, valor, pesoEspera);
    }

    /**
     * @param valor nuevo peso W de la urgencia en la cola de espera
     * @return pesos con el peso de espera sustituido
     */
    public PesosFitness conPesoEspera(double valor) {
        return new PesosFitness(umbralHolguraMinutos, factorHolguraBlanda, penalizacionTardanzaBase,
                penalizacionPorMinutoTarde, penalizacionSinRutearBase, valor);
    }

    @Override
    public String toString() {
        return String.format("U=%d A=%s H=%s B=%s C=%s W=%s", umbralHolguraMinutos,
                factorHolguraBlanda, penalizacionTardanzaBase, penalizacionPorMinutoTarde,
                penalizacionSinRutearBase, pesoEspera);
    }
}
