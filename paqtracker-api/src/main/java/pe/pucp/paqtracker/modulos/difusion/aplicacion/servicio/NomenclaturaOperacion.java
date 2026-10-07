package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;

/**
 * Codigos y nombres visibles de las entidades del nucleo, compartidos por la difusion y por las
 * respuestas REST para que el front vea siempre el mismo codigo.
 */
public final class NomenclaturaOperacion {

    private static final String[] CODIGOS_ALMACEN = {"CENTRAL", "INTERMEDIO_1", "INTERMEDIO_2"};
    private static final String[] NOMBRES_ALMACEN = {"Almacen central", "Almacen intermedio 1",
        "Almacen intermedio 2"};

    /**
     * Codigo de una unidad: prefijo de su tipo y correlativo dentro del tipo (A-01, M-03, B-12). La
     * flota se crea en orden autos, motos, bicicletas con ids consecutivos desde cero.
     *
     * @param vehiculo unidad
     * @return codigo visible
     */
    public static String codigoUnidad(Vehiculo vehiculo) {
        int correlativo = switch (vehiculo.getTipo()) {
            case AUTO -> vehiculo.getId() + 1;
            case MOTOCICLETA -> vehiculo.getId() - ConfiguracionDominio.CANTIDAD_AUTOS + 1;
            case BICICLETA -> vehiculo.getId() - ConfiguracionDominio.CANTIDAD_AUTOS
                    - ConfiguracionDominio.CANTIDAD_MOTOS + 1;
        };
        return String.format("%s-%02d", prefijo(vehiculo.getTipo()), correlativo);
    }

    /**
     * @param tipo tipo de unidad del nucleo
     * @return tipo visible: AUTO, MOTO o BICICLETA
     */
    public static String tipoUnidad(TipoVehiculo tipo) {
        return tipo == TipoVehiculo.MOTOCICLETA ? "MOTO" : tipo.name();
    }

    /**
     * @param idPedido identificador del pedido en la ejecucion
     * @return codigo visible, p. ej. P-00042
     */
    public static String codigoPedido(int idPedido) {
        return String.format("P-%05d", idPedido);
    }

    /**
     * @param almacen almacen
     * @return CENTRAL, INTERMEDIO_1 o INTERMEDIO_2
     */
    public static String codigoAlmacen(Almacen almacen) {
        return CODIGOS_ALMACEN[almacen.getId()];
    }

    /**
     * @param almacen almacen
     * @return nombre visible
     */
    public static String nombreAlmacen(Almacen almacen) {
        return NOMBRES_ALMACEN[almacen.getId()];
    }

    private static String prefijo(TipoVehiculo tipo) {
        return switch (tipo) {
            case AUTO -> "A";
            case MOTOCICLETA -> "M";
            case BICICLETA -> "B";
        };
    }

    private NomenclaturaOperacion() {
    }
}
