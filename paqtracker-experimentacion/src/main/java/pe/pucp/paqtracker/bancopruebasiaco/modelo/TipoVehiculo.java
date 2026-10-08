package pe.pucp.paqtracker.bancopruebasiaco.modelo;

/**
 * Tipos de unidad de reparto. El prefijo es el que aparece en el archivo de
 * mantenimiento preventivo ({@code TA01}, {@code TM07}, {@code TB11}, ...).
 */
public enum TipoVehiculo {
    TA("TA"),   // automóvil
    TM("TM"),   // motocicleta
    TB("TB");   // bicicleta

    private final String prefijo;

    TipoVehiculo(String prefijo) {
        this.prefijo = prefijo;
    }

    public String prefijo() {
        return prefijo;
    }

    /** Deduce el tipo a partir del código de unidad ({@code TA01} -> {@link #TA}). */
    public static TipoVehiculo deCodigoUnidad(String codigoUnidad) {
        String p = codigoUnidad.substring(0, 2).toUpperCase();
        for (TipoVehiculo t : values()) {
            if (t.prefijo.equals(p)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Código de unidad desconocido: " + codigoUnidad);
    }
}
