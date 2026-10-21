package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.List;

/**
 * Lo ocurrido en un paso del reloj de la simulacion. Existe para que quien
 * conduce la simulacion en vivo (la API) pueda difundir los eventos del paso
 * sin reconstruirlos comparando estados.
 */
public final class ResultadoPaso {

    /** Valor de {@link #getTiempoComputoMs()} cuando el paso no planifico. */
    public static final long SIN_PLANIFICACION = -1L;

    private final int instante;
    private final List<Pedido> pedidosIncorporados;
    private final List<Tramo> entregasCompletadas;
    private final List<Vehiculo> unidadesLiberadas;
    private final List<UnidadEnTransito> unidadesDespachadas;
    private final long tiempoComputoMs;
    private final double fitness;
    private final boolean colapsoDeclarado;
    private final List<AveriaAplicada> averiasAplicadas;
    private final List<Vehiculo> unidadesReincorporadas;

    /**
     * @param instante            instante del reloj del paso
     * @param pedidosIncorporados pedidos que entraron a la cola en el paso
     * @param entregasCompletadas tramos de entrega cuya llegada cayo desde el paso anterior
     * @param unidadesLiberadas   unidades que terminaron su ruta y quedaron libres
     * @param unidadesDespachadas unidades que salieron en el paso, con sus tramos
     * @param tiempoComputoMs     Ta de la planificacion del paso, o {@link #SIN_PLANIFICACION}
     * @param fitness             fitness del plan del paso; cero si no planifico
     * @param colapsoDeclarado    verdadero si el colapso se declaro en este paso
     * @param averiasAplicadas    averias que se aplicaron en el paso
     * @param unidadesReincorporadas unidades averiadas que volvieron a operar en el paso
     */
    ResultadoPaso(int instante, List<Pedido> pedidosIncorporados, List<Tramo> entregasCompletadas,
                  List<Vehiculo> unidadesLiberadas, List<UnidadEnTransito> unidadesDespachadas,
                  long tiempoComputoMs, double fitness, boolean colapsoDeclarado,
                  List<AveriaAplicada> averiasAplicadas, List<Vehiculo> unidadesReincorporadas) {
        this.instante = instante;
        this.pedidosIncorporados = List.copyOf(pedidosIncorporados);
        this.entregasCompletadas = List.copyOf(entregasCompletadas);
        this.unidadesLiberadas = List.copyOf(unidadesLiberadas);
        this.unidadesDespachadas = List.copyOf(unidadesDespachadas);
        this.tiempoComputoMs = tiempoComputoMs;
        this.fitness = fitness;
        this.colapsoDeclarado = colapsoDeclarado;
        this.averiasAplicadas = List.copyOf(averiasAplicadas);
        this.unidadesReincorporadas = List.copyOf(unidadesReincorporadas);
    }

    /**
     * @return verdadero si en este paso corrio el planificador
     */
    public boolean huboPlanificacion() {
        return tiempoComputoMs != SIN_PLANIFICACION;
    }

    public int getInstante() {
        return instante;
    }

    public List<Pedido> getPedidosIncorporados() {
        return pedidosIncorporados;
    }

    public List<Tramo> getEntregasCompletadas() {
        return entregasCompletadas;
    }

    public List<Vehiculo> getUnidadesLiberadas() {
        return unidadesLiberadas;
    }

    public List<UnidadEnTransito> getUnidadesDespachadas() {
        return unidadesDespachadas;
    }

    public long getTiempoComputoMs() {
        return tiempoComputoMs;
    }

    public double getFitness() {
        return fitness;
    }

    public boolean isColapsoDeclarado() {
        return colapsoDeclarado;
    }

    /**
     * @return averias aplicadas en el paso, con su efecto sobre la unidad y su carga
     */
    public List<AveriaAplicada> getAveriasAplicadas() {
        return averiasAplicadas;
    }

    /**
     * @return unidades averiadas que volvieron a operar en el paso
     */
    public List<Vehiculo> getUnidadesReincorporadas() {
        return unidadesReincorporadas;
    }
}
