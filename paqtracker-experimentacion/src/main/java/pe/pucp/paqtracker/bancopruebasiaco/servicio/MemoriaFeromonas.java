package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Nodo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.TipoVehiculo;

import java.util.Arrays;

/**
 * Rastros de feromona zonales (M3), persistentes entre ciclos de replanificación.
 *
 * <p>La ciudad se divide en celdas de 10 × 10 km y se mantienen dos rastros:</p>
 * <ul>
 *   <li><b>arco</b>: atractivo de encadenar una entrega de la zona A con otra de la zona B.</li>
 *   <li><b>siembra</b>: atractivo de abrir una ruta hacia la zona Z con un tipo de vehículo.</li>
 * </ul>
 *
 * <p>Los valores se mantienen acotados en [τmin, τmax] al estilo MAX-MIN (M4). Como
 * el espacio de claves es diminuto (48 zonas), se guardan en arreglos planos: las
 * hormigas pueden leerlos en paralelo sin sincronización.</p>
 */
public final class MemoriaFeromonas {

    private static final int LADO_ZONA = 10;
    private static final int ZONAS_X = 8;   // rejilla de 70 km de ancho
    private static final int ZONAS_Y = 6;   // rejilla de 50 km de alto
    public static final int ZONAS = ZONAS_X * ZONAS_Y;

    private final double[] arco = new double[ZONAS * ZONAS];
    private final double[] siembra = new double[ZONAS * TipoVehiculo.values().length];
    private double tauMin;
    private double tauMax;

    public MemoriaFeromonas(double tauMin, double tauMax) {
        this.tauMin = tauMin;
        this.tauMax = tauMax;
        reiniciar();
    }

    public static int zona(Nodo n) {
        int zx = Math.min(ZONAS_X - 1, n.x() / LADO_ZONA);
        int zy = Math.min(ZONAS_Y - 1, n.y() / LADO_ZONA);
        return zx * ZONAS_Y + zy;
    }

    public void reiniciar() {
        Arrays.fill(arco, tauMax);
        Arrays.fill(siembra, tauMax);
    }

    public double arco(int zonaOrigen, int zonaDestino) {
        return arco[zonaOrigen * ZONAS + zonaDestino];
    }

    public double siembra(int zonaDestino, TipoVehiculo tipo) {
        return siembra[zonaDestino * TipoVehiculo.values().length + tipo.ordinal()];
    }

    public void depositarArco(int zonaOrigen, int zonaDestino, double peso) {
        int i = zonaOrigen * ZONAS + zonaDestino;
        arco[i] = Math.min(tauMax, arco[i] + peso);
    }

    public void depositarSiembra(int zonaDestino, TipoVehiculo tipo, double peso) {
        int i = zonaDestino * TipoVehiculo.values().length + tipo.ordinal();
        siembra[i] = Math.min(tauMax, siembra[i] + peso);
    }

    /** Actualización local estilo ACS (M15): acerca el arco recién usado a τmin. */
    public void evaporarArcoLocal(int zonaOrigen, int zonaDestino, double xi) {
        int i = zonaOrigen * ZONAS + zonaDestino;
        arco[i] = Math.max(tauMin, (1 - xi) * arco[i] + xi * tauMin);
    }

    public void evaporar(double rho) {
        for (int i = 0; i < arco.length; i++) {
            arco[i] = Math.max(tauMin, arco[i] * (1 - rho));
        }
        for (int i = 0; i < siembra.length; i++) {
            siembra[i] = Math.max(tauMin, siembra[i] * (1 - rho));
        }
    }

    /** Suavizado hacia τmax: {@code 0.5} reproduce el reinicio parcial de la v2.1. */
    public void suavizar(double fraccion) {
        for (int i = 0; i < arco.length; i++) {
            arco[i] += fraccion * (tauMax - arco[i]);
        }
        for (int i = 0; i < siembra.length; i++) {
            siembra[i] += fraccion * (tauMax - siembra[i]);
        }
    }

    /**
     * Factor de convergencia de MAX-MIN (M16): 0 cuando todos los rastros están en
     * τmin y 1 cuando todos alcanzaron τmax. Sirve para decidir cuándo suavizar.
     */
    public double factorConvergencia() {
        double suma = 0;
        double rango = tauMax - tauMin;
        if (rango <= 0) {
            return 1.0;
        }
        for (double v : arco) {
            suma += Math.max(tauMax - v, v - tauMin);
        }
        double media = suma / arco.length;
        return 2.0 * (media / rango - 0.5);
    }

    /** Recalcula los límites a partir de la mejor aptitud conocida (Stützle & Hoos). */
    public void ajustarLimites(double tauMaxNuevo, double proporcionMin) {
        this.tauMax = tauMaxNuevo;
        this.tauMin = tauMaxNuevo * proporcionMin;
        for (int i = 0; i < arco.length; i++) {
            arco[i] = Math.min(tauMax, Math.max(tauMin, arco[i]));
        }
        for (int i = 0; i < siembra.length; i++) {
            siembra[i] = Math.min(tauMax, Math.max(tauMin, siembra[i]));
        }
    }

    public double tauMin() { return tauMin; }

    public double tauMax() { return tauMax; }
}
