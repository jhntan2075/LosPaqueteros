package pe.pucp.paqtracker.planificador;

import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.util.Arrays;

/**
 * Rastros de feromona zonales de la colonia de hormigas, persistentes entre
 * ciclos de replanificacion. Adaptacion de iaco.servicio.MemoriaFeromonas al
 * modelo comun del planificador.
 *
 * La malla se divide en zonas de LADO_ZONA por LADO_ZONA y se mantienen dos
 * rastros: el de arco, que mide el atractivo de encadenar una entrega de una
 * zona con otra de otra zona, y el de siembra, que mide el atractivo de abrir
 * una ruta hacia una zona con un tipo de unidad. Los valores se acotan a
 * [tauMin, tauMax] al estilo MAX-MIN.
 *
 * Una sola instancia debe compartirse durante toda la simulacion para que el
 * aprendizaje de un ciclo se aproveche en los siguientes.
 */
public final class MemoriaFeromonas {

    /** Lado de cada zona de feromona, en kilometros de malla. */
    public static final int LADO_ZONA = 10;

    private static final int ZONAS_X = ConfiguracionDominio.MALLA_ANCHO / LADO_ZONA + 1;
    private static final int ZONAS_Y = ConfiguracionDominio.MALLA_ALTO / LADO_ZONA + 1;

    /** Cantidad total de zonas de la malla. */
    public static final int ZONAS = ZONAS_X * ZONAS_Y;

    private static final int TIPOS = TipoVehiculo.values().length;

    private final double tauMin;
    private final double tauMax;
    private final double[] arco = new double[ZONAS * ZONAS];
    private final double[] siembra = new double[ZONAS * TIPOS];

    /**
     * Crea la memoria con todos los rastros en tauMax.
     *
     * @param tauMin cota inferior de los rastros
     * @param tauMax cota superior de los rastros
     */
    public MemoriaFeromonas(double tauMin, double tauMax) {
        this.tauMin = tauMin;
        this.tauMax = tauMax;
        Arrays.fill(arco, tauMax);
        Arrays.fill(siembra, tauMax);
    }

    /**
     * @param nodo nodo de la malla
     * @return indice de la zona que contiene al nodo
     */
    public static int zona(Nodo nodo) {
        int zx = Math.max(0, Math.min(ZONAS_X - 1, nodo.getX() / LADO_ZONA));
        int zy = Math.max(0, Math.min(ZONAS_Y - 1, nodo.getY() / LADO_ZONA));
        return zx * ZONAS_Y + zy;
    }

    /**
     * @param zonaOrigen  zona de la entrega anterior
     * @param zonaDestino zona de la entrega siguiente
     * @return rastro del arco entre ambas zonas
     */
    public synchronized double arco(int zonaOrigen, int zonaDestino) {
        return arco[zonaOrigen * ZONAS + zonaDestino];
    }

    /**
     * @param zonaDestino zona hacia la que se abre la ruta
     * @param tipo        tipo de unidad que abre la ruta
     * @return rastro de siembra
     */
    public synchronized double siembra(int zonaDestino, TipoVehiculo tipo) {
        return siembra[zonaDestino * TIPOS + tipo.ordinal()];
    }

    /**
     * Refuerza el rastro de un arco, sin superar tauMax.
     *
     * @param zonaOrigen  zona de la entrega anterior
     * @param zonaDestino zona de la entrega siguiente
     * @param peso        cantidad depositada
     */
    public synchronized void depositarArco(int zonaOrigen, int zonaDestino, double peso) {
        int indice = zonaOrigen * ZONAS + zonaDestino;
        arco[indice] = Math.min(tauMax, arco[indice] + peso);
    }

    /**
     * Refuerza el rastro de siembra, sin superar tauMax.
     *
     * @param zonaDestino zona hacia la que se abrio la ruta
     * @param tipo        tipo de unidad que abrio la ruta
     * @param peso        cantidad depositada
     */
    public synchronized void depositarSiembra(int zonaDestino, TipoVehiculo tipo, double peso) {
        int indice = zonaDestino * TIPOS + tipo.ordinal();
        siembra[indice] = Math.min(tauMax, siembra[indice] + peso);
    }

    /**
     * Actualizacion local estilo ACS: acerca a tauMin el arco recien usado para
     * que las demas hormigas exploren alternativas.
     *
     * @param zonaOrigen  zona de la entrega anterior
     * @param zonaDestino zona de la entrega siguiente
     * @param xi          intensidad de la evaporacion local
     */
    public synchronized void evaporarArcoLocal(int zonaOrigen, int zonaDestino, double xi) {
        int indice = zonaOrigen * ZONAS + zonaDestino;
        arco[indice] = Math.max(tauMin, (1 - xi) * arco[indice] + xi * tauMin);
    }

    /**
     * Evaporacion global de todos los rastros, sin bajar de tauMin.
     *
     * @param rho tasa de evaporacion
     */
    public synchronized void evaporar(double rho) {
        for (int i = 0; i < arco.length; i++) {
            arco[i] = Math.max(tauMin, arco[i] * (1 - rho));
        }
        for (int i = 0; i < siembra.length; i++) {
            siembra[i] = Math.max(tauMin, siembra[i] * (1 - rho));
        }
    }

    /**
     * Acerca todos los rastros a tauMax; con fraccion 0,5 reproduce el reinicio
     * parcial por estancamiento.
     *
     * @param fraccion proporcion de la distancia a tauMax que se recupera
     */
    public synchronized void suavizar(double fraccion) {
        for (int i = 0; i < arco.length; i++) {
            arco[i] += fraccion * (tauMax - arco[i]);
        }
        for (int i = 0; i < siembra.length; i++) {
            siembra[i] += fraccion * (tauMax - siembra[i]);
        }
    }

    /**
     * Factor de convergencia de MAX-MIN: cercano a 1 cuando los rastros de arco
     * se concentraron en los extremos y cercano a 0 cuando estan repartidos.
     *
     * @return factor de convergencia de los arcos
     */
    public synchronized double factorConvergencia() {
        double rango = tauMax - tauMin;
        if (rango <= 0) {
            return 1.0;
        }
        double suma = 0;
        for (double valor : arco) {
            suma += Math.max(tauMax - valor, valor - tauMin);
        }
        return 2.0 * (suma / arco.length / rango - 0.5);
    }
}
