package pe.pucp.paqtracker.iaco.modelo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Parámetros configurables del dominio: rejilla, almacenes, perfiles de vehículo
 * (LE-020/021/022), turnos (LE-023), refrigerio (LE-024) y tiempo de entrega (LE-025).
 *
 * <p>Los valores de {@link #porDefecto()} son los del banco de pruebas Python con el
 * que se calibraron los resultados de enero a junio de 2026.</p>
 */
public final class ConfiguracionDominio {

    /** Capacidad en paquetes, velocidad media en km/h y costo por km recorrido. */
    public record PerfilVehiculo(int capacidad, double velocidadKmH, double costoPorKm) {}

    private final int anchoRejilla;
    private final int altoRejilla;
    private final Almacen almacenCentral;
    private final List<Almacen> almacenesIntermedios;
    private final List<Almacen> almacenes;
    private final int[] iniciosTurno;
    private final int duracionTurno;
    private final int minutosEntrega;
    private final int minutosRefrigerio;
    private final int desfaseRefrigerio;
    private final int pasoRefrigerio;
    private final int gruposRefrigerio;
    private final Map<TipoVehiculo, PerfilVehiculo> perfiles;

    public ConfiguracionDominio(int anchoRejilla,
                                int altoRejilla,
                                Almacen almacenCentral,
                                List<Almacen> almacenesIntermedios,
                                int[] iniciosTurno,
                                int duracionTurno,
                                int minutosEntrega,
                                int minutosRefrigerio,
                                int desfaseRefrigerio,
                                int pasoRefrigerio,
                                int gruposRefrigerio,
                                Map<TipoVehiculo, PerfilVehiculo> perfiles) {
        this.anchoRejilla = anchoRejilla;
        this.altoRejilla = altoRejilla;
        this.almacenCentral = almacenCentral;
        this.almacenesIntermedios = List.copyOf(almacenesIntermedios);
        List<Almacen> todos = new ArrayList<>();
        todos.add(almacenCentral);
        todos.addAll(this.almacenesIntermedios);
        this.almacenes = Collections.unmodifiableList(todos);
        this.iniciosTurno = iniciosTurno.clone();
        this.duracionTurno = duracionTurno;
        this.minutosEntrega = minutosEntrega;
        this.minutosRefrigerio = minutosRefrigerio;
        this.desfaseRefrigerio = desfaseRefrigerio;
        this.pasoRefrigerio = pasoRefrigerio;
        this.gruposRefrigerio = gruposRefrigerio;
        this.perfiles = Collections.unmodifiableMap(new EnumMap<>(perfiles));
    }

    public static ConfiguracionDominio porDefecto() {
        Almacen central = Almacen.central("ALM-C", new Nodo(25, 15));
        List<Almacen> intermedios = List.of(
                Almacen.intermedio("ALM-N", new Nodo(12, 38), 1000),
                Almacen.intermedio("ALM-E", new Nodo(55, 27), 1000));
        Map<TipoVehiculo, PerfilVehiculo> perfiles = new EnumMap<>(TipoVehiculo.class);
        perfiles.put(TipoVehiculo.TA, new PerfilVehiculo(30, 40, 1.20));
        perfiles.put(TipoVehiculo.TM, new PerfilVehiculo(15, 35, 0.60));
        perfiles.put(TipoVehiculo.TB, new PerfilVehiculo(8, 20, 0.15));
        return new ConfiguracionDominio(
                70, 50, central, intermedios,
                new int[]{7 * 60, 15 * 60, 23 * 60}, 480,
                60, 60, 180, 60, 3,
                perfiles);
    }

    public int anchoRejilla() { return anchoRejilla; }

    public int altoRejilla() { return altoRejilla; }

    public int nodosRejilla() { return (anchoRejilla + 1) * (altoRejilla + 1); }

    public Almacen almacenCentral() { return almacenCentral; }

    public List<Almacen> almacenesIntermedios() { return almacenesIntermedios; }

    public List<Almacen> almacenes() { return almacenes; }

    public int[] iniciosTurno() { return iniciosTurno.clone(); }

    public int duracionTurno() { return duracionTurno; }

    public int minutosEntrega() { return minutosEntrega; }

    public int minutosRefrigerio() { return minutosRefrigerio; }

    public int desfaseRefrigerio() { return desfaseRefrigerio; }

    public int pasoRefrigerio() { return pasoRefrigerio; }

    public int gruposRefrigerio() { return gruposRefrigerio; }

    public PerfilVehiculo perfil(TipoVehiculo tipo) {
        PerfilVehiculo p = perfiles.get(tipo);
        if (p == null) {
            throw new IllegalArgumentException("Sin perfil configurado para " + tipo);
        }
        return p;
    }

    public Map<TipoVehiculo, PerfilVehiculo> perfiles() { return perfiles; }

    /** Distancia Manhattan al almacén más cercano al nodo dado. */
    public int distanciaAlAlmacenMasCercano(Nodo n) {
        int mejor = Integer.MAX_VALUE;
        for (Almacen a : almacenes) {
            mejor = Math.min(mejor, n.manhattan(a.nodo()));
        }
        return mejor;
    }

    public Almacen almacenMasCercano(Nodo n) {
        Almacen mejor = almacenes.get(0);
        int d = mejor.nodo().manhattan(n);
        for (Almacen a : almacenes) {
            int di = a.nodo().manhattan(n);
            if (di < d) {
                d = di;
                mejor = a;
            }
        }
        return mejor;
    }

    public boolean esAlmacen(Nodo n) {
        for (Almacen a : almacenes) {
            if (a.nodo().equals(n)) {
                return true;
            }
        }
        return false;
    }
}
