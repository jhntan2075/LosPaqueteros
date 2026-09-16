package pe.pucp.paqtracker.iaco.servicio;

import pe.pucp.paqtracker.iaco.modelo.Almacen;
import pe.pucp.paqtracker.iaco.modelo.Nodo;
import pe.pucp.paqtracker.iaco.modelo.Pedido;
import pe.pucp.paqtracker.iaco.modelo.Unidad;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Fotografía del sistema en un ciclo de replanificación: qué está pendiente, qué
 * unidades hay libres, cuánto stock queda en cada almacén intermedio y con qué
 * evaluador cronometrar.
 *
 * <p>El planificador devuelve rutas y, opcionalmente, deja aquí las
 * {@link Reubicacion reubicaciones en vacío} que quiere que el simulador ejecute.</p>
 */
public final class ContextoPlanificacion {

    /** Traslado sin carga de una unidad ociosa a otro almacén. */
    public record Reubicacion(Unidad unidad, Almacen destino) {}

    private final double minuto;
    private final List<Pedido> pendientes;
    private final List<Unidad> unidadesLibres;
    private final List<Unidad> flota;
    private final Map<Nodo, Integer> stockIntermedio;
    private final EvaluadorRuta evaluador;
    private final List<Reubicacion> reubicaciones = new ArrayList<>();

    public ContextoPlanificacion(double minuto,
                                 List<Pedido> pendientes,
                                 List<Unidad> unidadesLibres,
                                 List<Unidad> flota,
                                 Map<Nodo, Integer> stockIntermedio,
                                 EvaluadorRuta evaluador) {
        this.minuto = minuto;
        this.pendientes = pendientes;
        this.unidadesLibres = unidadesLibres;
        this.flota = flota;
        this.stockIntermedio = stockIntermedio;
        this.evaluador = evaluador;
    }

    public double minuto() { return minuto; }

    public List<Pedido> pendientes() { return pendientes; }

    public List<Unidad> unidadesLibres() { return unidadesLibres; }

    public List<Unidad> flota() { return flota; }

    public EvaluadorRuta evaluador() { return evaluador; }

    public Ciudad ciudad() { return evaluador.ciudad(); }

    /** Paquetes disponibles en el nodo: ilimitado si no es un almacén intermedio. */
    public int disponible(Nodo nodo) {
        Integer s = stockIntermedio.get(nodo);
        return s == null ? Almacen.STOCK_ILIMITADO : s;
    }

    public Map<Nodo, Integer> stockIntermedio() { return stockIntermedio; }

    public List<Reubicacion> reubicaciones() { return reubicaciones; }

    public void proponerReubicacion(Unidad u, Almacen destino) {
        reubicaciones.add(new Reubicacion(u, destino));
    }
}
