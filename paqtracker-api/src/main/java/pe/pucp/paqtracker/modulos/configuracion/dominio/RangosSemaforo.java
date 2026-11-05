package pe.pucp.paqtracker.modulos.configuracion.dominio;

import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import java.util.Locale;

/**
 * Rangos vigentes de los cuatro semaforos de la operacion, como fracciones entre 0 y 1. Se validan al
 * construirse, asi que no existen rangos con umbrales fuera de orden o fuera de [0, 1].
 *
 * @param holgura          holgura restante del pedido sobre su plazo (menos es peor)
 * @param inventario       stock de un almacen intermedio sobre su capacidad, alerta de stock bajo (menos es peor)
 * @param ocupacionUnidad  carga de una unidad sobre su capacidad, con estado vacio
 * @param ocupacionAlmacen stock de un almacen intermedio sobre su capacidad, con estado vacio
 */
public record RangosSemaforo(CortesPorDebajo holgura, CortesPorDebajo inventario, CortesCarga ocupacionUnidad,
                             CortesCarga ocupacionAlmacen) {

    /** Nivel rojo del semaforo. */
    public static final String NIVEL_ROJO = "ROJO";
    /** Nivel ambar del semaforo. */
    public static final String NIVEL_AMBAR = "AMBAR";
    /** Nivel verde del semaforo. */
    public static final String NIVEL_VERDE = "VERDE";

    /** Menor fraccion admitida en un umbral. */
    public static final double FRACCION_MINIMA = 0.0;
    /** Mayor fraccion admitida en un umbral. */
    public static final double FRACCION_MAXIMA = 1.0;

    /** Ocupacion de una unidad que regia antes de ser configurable: vacio solo sin carga, 70 % y 90 %. */
    public static final CortesCarga OCUPACION_UNIDAD_POR_DEFECTO = new CortesCarga(0.0, 0.70, 0.90);
    /** Ocupacion de un almacen que regia antes de ser configurable: vacio solo sin stock, 50 % y 80 %. */
    public static final CortesCarga OCUPACION_ALMACEN_POR_DEFECTO = new CortesCarga(0.0, 0.50, 0.80);

    /**
     * @throws SolicitudInvalidaException si falta un grupo, un umbral esta fuera de [0, 1] o no respeta el
     *                                    orden rojo &lt; ambar (holgura, inventario) o vacio &lt; ambar &lt; rojo
     *                                    (ocupacion)
     */
    public RangosSemaforo {
        if (holgura == null || inventario == null || ocupacionUnidad == null || ocupacionAlmacen == null) {
            throw new SolicitudInvalidaException("Faltan rangos del semáforo: se esperan holgura, inventario, "
                    + "ocupacionUnidad y ocupacionAlmacen");
        }
        validarPorDebajo("Holgura", holgura);
        validarPorDebajo("Inventario", inventario);
        validarCarga("Ocupación de unidades", ocupacionUnidad);
        validarCarga("Ocupación de almacenes", ocupacionAlmacen);
    }

    /**
     * Rangos iniciales: holgura e inventario desde las variables de entorno, ocupacion con los valores que
     * usaba la interfaz.
     *
     * @param semaforo cortes iniciales de application.yml
     * @return rangos validados
     */
    public static RangosSemaforo inicial(PropiedadesDominio.Semaforo semaforo) {
        return new RangosSemaforo(new CortesPorDebajo(semaforo.fraccionRojo(), semaforo.fraccionAmbar()),
                new CortesPorDebajo(semaforo.inventarioRojo(), semaforo.inventarioAmbar()),
                OCUPACION_UNIDAD_POR_DEFECTO, OCUPACION_ALMACEN_POR_DEFECTO);
    }

    /**
     * Semaforo donde menos es peor: rojo por debajo de {@code rojo}, ambar por debajo de {@code ambar} y verde
     * desde {@code ambar}.
     *
     * @param rojo  fraccion bajo la que el nivel es rojo
     * @param ambar fraccion bajo la que el nivel es ambar
     */
    public record CortesPorDebajo(double rojo, double ambar) {

        /**
         * @param fraccion valor medido, como fraccion
         * @return ROJO, AMBAR o VERDE
         */
        public String nivel(double fraccion) {
            if (fraccion < rojo) {
                return NIVEL_ROJO;
            }
            return fraccion < ambar ? NIVEL_AMBAR : NIVEL_VERDE;
        }
    }

    /**
     * Semaforo de carga con estado vacio: vacio hasta {@code vacio} inclusive (con 0, solo sin carga), verde
     * por debajo de {@code ambar}, ambar por debajo de {@code rojo} y rojo desde {@code rojo}. La API no lo
     * calcula: lo guarda para que la interfaz pinte unidades y almacenes con los mismos cortes.
     *
     * @param vacio fraccion hasta la que se considera vacio
     * @param ambar fraccion desde la que el nivel es ambar
     * @param rojo  fraccion desde la que el nivel es rojo
     */
    public record CortesCarga(double vacio, double ambar, double rojo) {
    }

    private static void validarPorDebajo(String nombre, CortesPorDebajo cortes) {
        validarFraccion(nombre, "rojo", cortes.rojo());
        validarFraccion(nombre, "ámbar", cortes.ambar());
        if (cortes.rojo() >= cortes.ambar()) {
            throw new SolicitudInvalidaException(String.format(Locale.ROOT,
                    "%s: el umbral rojo (%s) debe ser menor que el ámbar (%s)", nombre, cortes.rojo(),
                    cortes.ambar()));
        }
    }

    private static void validarCarga(String nombre, CortesCarga cortes) {
        validarFraccion(nombre, "vacío", cortes.vacio());
        validarFraccion(nombre, "ámbar", cortes.ambar());
        validarFraccion(nombre, "rojo", cortes.rojo());
        if (cortes.vacio() >= cortes.ambar() || cortes.ambar() >= cortes.rojo()) {
            throw new SolicitudInvalidaException(String.format(Locale.ROOT,
                    "%s: los umbrales deben cumplir vacío (%s) < ámbar (%s) < rojo (%s)", nombre, cortes.vacio(),
                    cortes.ambar(), cortes.rojo()));
        }
    }

    private static void validarFraccion(String nombre, String umbral, double valor) {
        if (!Double.isFinite(valor) || valor < FRACCION_MINIMA || valor > FRACCION_MAXIMA) {
            throw new SolicitudInvalidaException(String.format(Locale.ROOT,
                    "%s: el umbral %s (%s) debe estar entre %s y %s", nombre, umbral, valor, FRACCION_MINIMA,
                    FRACCION_MAXIMA));
        }
    }
}
