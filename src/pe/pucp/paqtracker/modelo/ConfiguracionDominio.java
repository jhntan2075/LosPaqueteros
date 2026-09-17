package pe.pucp.paqtracker.modelo;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuracion centralizada de los parametros de negocio del dominio. Reune en
 * un solo punto los valores que el estandar prohibe dispersar por el codigo:
 * dimensiones de la malla, ubicaciones y stock de los almacenes, composicion de
 * la flota y tiempo de acondicionamiento por entrega.
 */
public final class ConfiguracionDominio {

    /** Ancho de la malla de la ciudad (eje X). */
    public static final int MALLA_ANCHO = 70;

    /** Alto de la malla de la ciudad (eje Y). */
    public static final int MALLA_ALTO = 50;

    /** Tiempo de acondicionamiento del producto por entrega, en minutos. */
    public static final int TIEMPO_SERVICIO_MINUTOS = 60;

    /** Plazo maximo del catalogo de pedidos, en minutos (36 horas). */
    public static final int PLAZO_MAXIMO_MINUTOS = 2160;

    /**
     * Plazo, en minutos, a partir del cual un pedido se considera urgente y se
     * despacha de inmediato en la primera unidad libre con capacidad
     * suficiente, sin competir por la funcion de fitness del planificador
     * (8 horas). Para una ventana de entrega tan corta, esperar un ciclo de
     * optimizacion consume una porcion demasiado grande de su plazo.
     */
    public static final int PLAZO_DESPACHO_DIRECTO_MINUTOS = 480;

    /** Stock inicial de cada almacen intermedio. */
    public static final int STOCK_INTERMEDIO = 1000;

    /** Cantidad de unidades de cada tipo en la flota. */
    public static final int CANTIDAD_AUTOS = 10;
    public static final int CANTIDAD_MOTOS = 15;
    public static final int CANTIDAD_BICICLETAS = 12;

    /** Minuto del dia en que inicia cada turno de 8 horas (LE-023). */
    private static final int[] INICIOS_TURNO_MINUTOS = {7 * 60, 15 * 60, 23 * 60};

    /** Duracion de cada turno, en minutos. */
    public static final int DURACION_TURNO_MINUTOS = 480;

    /** Duracion del refrigerio, en minutos (LE-024). */
    public static final int MINUTOS_REFRIGERIO = 60;

    /**
     * Minutos desde el inicio del turno hasta el refrigerio del primer grupo
     * de unidades. Deja al menos una hora de margen con el inicio del turno.
     */
    public static final int DESFASE_REFRIGERIO_MINUTOS = 180;

    /**
     * Minutos entre el refrigerio de un grupo de unidades y el siguiente. Con
     * {@link #GRUPOS_REFRIGERIO} grupos y este paso, el ultimo grupo sale a
     * refrigerio con al menos una hora de margen antes del fin del turno.
     */
    public static final int PASO_REFRIGERIO_MINUTOS = 60;

    /**
     * Cantidad de grupos entre los que se escalona el refrigerio, para que no
     * toda la flota se detenga a la vez.
     */
    public static final int GRUPOS_REFRIGERIO = 3;

    /**
     * @return minutos del dia en que inicia cada turno
     */
    public static int[] iniciosTurno() {
        return INICIOS_TURNO_MINUTOS.clone();
    }

    /**
     * Construye los tres almacenes del proyecto en sus posiciones reales.
     *
     * @return lista con el almacen central y los dos intermedios
     */
    public static List<Almacen> crearAlmacenes() {
        List<Almacen> almacenes = new ArrayList<>();
        almacenes.add(new Almacen(0, new Nodo(27, 14), true, Integer.MAX_VALUE));
        almacenes.add(new Almacen(1, new Nodo(12, 38), false, STOCK_INTERMEDIO));
        almacenes.add(new Almacen(2, new Nodo(57, 27), false, STOCK_INTERMEDIO));
        return almacenes;
    }

    /**
     * Construye la flota completa, con todas las unidades ubicadas en el
     * almacen central al inicio de la operacion.
     *
     * @param central almacen central de partida
     * @return lista de vehiculos de la flota
     */
    public static List<Vehiculo> crearFlota(Almacen central) {
        List<Vehiculo> flota = new ArrayList<>();
        int id = 0;
        for (int i = 0; i < CANTIDAD_AUTOS; i++) {
            flota.add(new Vehiculo(id++, TipoVehiculo.AUTO, central));
        }
        for (int i = 0; i < CANTIDAD_MOTOS; i++) {
            flota.add(new Vehiculo(id++, TipoVehiculo.MOTOCICLETA, central));
        }
        for (int i = 0; i < CANTIDAD_BICICLETAS; i++) {
            flota.add(new Vehiculo(id++, TipoVehiculo.BICICLETA, central));
        }
        return flota;
    }

    private ConfiguracionDominio() {
    }
}
