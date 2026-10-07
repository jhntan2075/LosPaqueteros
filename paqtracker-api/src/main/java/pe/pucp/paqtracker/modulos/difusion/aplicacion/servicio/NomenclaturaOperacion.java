package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Codigos y nombres visibles de las entidades del nucleo, compartidos por la difusion y por las
 * respuestas REST para que el front vea siempre el mismo codigo. Los codigos de unidad dependen de la
 * flota de cada ejecucion y viven en {@link CodigosFlota}.
 */
public final class NomenclaturaOperacion {

    private static final String[] CODIGOS_ALMACEN = {"CENTRAL", "INTERMEDIO_1", "INTERMEDIO_2"};
    private static final String[] NOMBRES_ALMACEN = {"Almacen central", "Almacen intermedio 1",
        "Almacen intermedio 2"};
    private static final Pattern PATRON_PEDIDO = Pattern.compile("P-(\\d+)");

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
     * @param codigo codigo visible, p. ej. P-00042
     * @return identificador del pedido en la ejecucion
     * @throws IllegalArgumentException si el codigo no tiene el formato P-NNNNN
     */
    public static int idDePedido(String codigo) {
        Matcher matcher = codigo == null ? null : PATRON_PEDIDO.matcher(codigo.trim());
        if (matcher == null || !matcher.matches()) {
            throw new IllegalArgumentException("Codigo de pedido invalido: " + codigo);
        }
        return Integer.parseInt(matcher.group(1));
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

    private NomenclaturaOperacion() {
    }
}
