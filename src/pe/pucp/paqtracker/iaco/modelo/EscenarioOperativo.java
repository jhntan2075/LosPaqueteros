package pe.pucp.paqtracker.iaco.modelo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Entrada completa de una corrida: configuración de dominio, demanda del mes,
 * bloqueos vigentes, flota y plan de mantenimiento preventivo por día.
 */
public final class EscenarioOperativo {

    private final String etiqueta;
    private final ConfiguracionDominio configuracion;
    private final List<Pedido> pedidos;
    private final List<Bloqueo> bloqueos;
    private final List<String> codigosFlota;
    private final Map<Integer, Set<String>> mantenimientoPorDia;
    private final int diasMes;
    private final int diasExtra;

    public EscenarioOperativo(String etiqueta,
                              ConfiguracionDominio configuracion,
                              List<Pedido> pedidos,
                              List<Bloqueo> bloqueos,
                              List<String> codigosFlota,
                              Map<Integer, Set<String>> mantenimientoPorDia,
                              int diasMes,
                              int diasExtra) {
        this.etiqueta = etiqueta;
        this.configuracion = configuracion;
        this.pedidos = Collections.unmodifiableList(new ArrayList<>(pedidos));
        this.bloqueos = List.copyOf(bloqueos);
        this.codigosFlota = List.copyOf(codigosFlota);
        this.mantenimientoPorDia = Map.copyOf(mantenimientoPorDia);
        this.diasMes = diasMes;
        this.diasExtra = diasExtra;
    }

    public String etiqueta() { return etiqueta; }

    public ConfiguracionDominio configuracion() { return configuracion; }

    public List<Pedido> pedidos() { return pedidos; }

    public List<Bloqueo> bloqueos() { return bloqueos; }

    public List<String> codigosFlota() { return codigosFlota; }

    public int diasMes() { return diasMes; }

    public int diasExtra() { return diasExtra; }

    /** Horizonte simulado: el mes más un colchón para cerrar las últimas entregas. */
    public int horizonteMinutos() { return (diasMes + diasExtra) * 1440; }

    /** Unidades en mantenimiento preventivo el día indicado (1 = primer día del mes). */
    public Set<String> enMantenimiento(int dia) {
        if (dia > diasMes) {
            return Set.of();
        }
        return mantenimientoPorDia.getOrDefault(dia, Set.of());
    }

    /** Construye la flota inicial, toda estacionada en el almacén central. */
    public List<Unidad> crearFlota() {
        List<Unidad> flota = new ArrayList<>(codigosFlota.size());
        Nodo central = configuracion.almacenCentral().nodo();
        for (int i = 0; i < codigosFlota.size(); i++) {
            flota.add(new Unidad(codigosFlota.get(i), i, configuracion, central));
        }
        return flota;
    }

    public void reiniciarPedidos() {
        for (Pedido p : pedidos) {
            p.reiniciar();
        }
    }

    @Override
    public String toString() {
        return "Escenario " + etiqueta + ": " + pedidos.size() + " pedidos, "
                + bloqueos.size() + " bloqueos, " + codigosFlota.size() + " unidades, "
                + diasMes + " días";
    }
}
