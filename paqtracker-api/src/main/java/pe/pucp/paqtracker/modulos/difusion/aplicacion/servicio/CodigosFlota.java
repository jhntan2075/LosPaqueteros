package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Codigos visibles de las unidades de una ejecucion: prefijo del tipo y correlativo dentro del tipo
 * (A-01, M-03, B-12). Se calculan una vez a partir de la flota real, porque la composicion puede
 * cambiar de una simulacion a otra (LE-019).
 */
public final class CodigosFlota {

    private final Map<Integer, String> codigos;

    private CodigosFlota(Map<Integer, String> codigos) {
        this.codigos = Map.copyOf(codigos);
    }

    /**
     * @param flota flota de la ejecucion, en su orden de creacion
     * @return codigos de todas sus unidades
     */
    public static CodigosFlota de(List<Vehiculo> flota) {
        Map<TipoVehiculo, Integer> correlativos = new EnumMap<>(TipoVehiculo.class);
        Map<Integer, String> codigos = new HashMap<>();
        for (Vehiculo vehiculo : flota) {
            int correlativo = correlativos.merge(vehiculo.getTipo(), 1, Integer::sum);
            codigos.put(vehiculo.getId(), String.format("%s-%02d", prefijo(vehiculo.getTipo()), correlativo));
        }
        return new CodigosFlota(codigos);
    }

    /**
     * @param vehiculo unidad de la flota
     * @return codigo visible
     * @throws IllegalArgumentException si la unidad no es de esta flota
     */
    public String codigo(Vehiculo vehiculo) {
        String codigo = codigos.get(vehiculo.getId());
        if (codigo == null) {
            throw new IllegalArgumentException("La unidad " + vehiculo.getId() + " no pertenece a la flota");
        }
        return codigo;
    }

    private static String prefijo(TipoVehiculo tipo) {
        return switch (tipo) {
            case AUTO -> "A";
            case MOTOCICLETA -> "M";
            case BICICLETA -> "B";
        };
    }
}
