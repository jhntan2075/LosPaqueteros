package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.Optional;

/**
 * Primer incumplimiento de plazo de una simulacion, que declara el colapso
 * logistico (LE-067). Guarda el pedido que falla y la causa, para que quien
 * conduce la simulacion pueda informar el colapso y no solo su instante.
 */
public final class ColapsoLogistico {

    /** Valor de {@link #getLlegadaEstimada()} cuando el pedido no salio en ninguna unidad. */
    public static final int SIN_LLEGADA = -1;

    /**
     * Motivo por el que el pedido no cumple su plazo.
     */
    public enum Causa {
        /** La unidad que lleva el pedido llega despues de su hora limite. */
        ENTREGA_TARDIA,
        /** La hora limite vencio sin que el pedido saliera en ninguna unidad. */
        PLAZO_VENCIDO_SIN_DESPACHO
    }

    private final Causa causa;
    private final int idPedido;
    private final int instante;
    private final int horaLimite;
    private final int llegadaEstimada;
    private final Vehiculo vehiculo;

    private ColapsoLogistico(Causa causa, int idPedido, int instante, int horaLimite, int llegadaEstimada,
                             Vehiculo vehiculo) {
        this.causa = causa;
        this.idPedido = idPedido;
        this.instante = instante;
        this.horaLimite = horaLimite;
        this.llegadaEstimada = llegadaEstimada;
        this.vehiculo = vehiculo;
    }

    /**
     * Colapso por una entrega despachada que llegara tarde. Se declara al
     * despachar, porque desde ese instante el incumplimiento ya es seguro.
     *
     * @param idPedido        pedido de la entrega tardia
     * @param salida          instante de salida de la ruta, en que se declara el colapso
     * @param horaLimite      hora limite del pedido
     * @param llegadaEstimada instante estimado de llegada de la unidad al cliente
     * @param vehiculo        unidad que lleva la entrega
     * @return colapso por entrega tardia
     */
    static ColapsoLogistico porEntregaTardia(int idPedido, int salida, int horaLimite, int llegadaEstimada,
                                             Vehiculo vehiculo) {
        return new ColapsoLogistico(Causa.ENTREGA_TARDIA, idPedido, salida, horaLimite, llegadaEstimada,
                vehiculo);
    }

    /**
     * Colapso por un pedido cuyo plazo vencio sin despacharse. El colapso se
     * ubica en su hora limite, que es cuando el pedido dejo de poder cumplirse.
     *
     * @param pedido pedido vencido
     * @return colapso por plazo vencido sin despacho
     */
    static ColapsoLogistico porPlazoVencidoSinDespacho(Pedido pedido) {
        return new ColapsoLogistico(Causa.PLAZO_VENCIDO_SIN_DESPACHO, pedido.getId(), pedido.getHoraLimite(),
                pedido.getHoraLimite(), SIN_LLEGADA, null);
    }

    public Causa getCausa() {
        return causa;
    }

    public int getIdPedido() {
        return idPedido;
    }

    /**
     * @return minuto simulado en que se declara el colapso
     */
    public int getInstante() {
        return instante;
    }

    public int getHoraLimite() {
        return horaLimite;
    }

    /**
     * @return minuto estimado de llegada al cliente, o {@link #SIN_LLEGADA} si no se despacho
     */
    public int getLlegadaEstimada() {
        return llegadaEstimada;
    }

    /**
     * @return unidad que lleva el pedido, o vacio si no se despacho
     */
    public Optional<Vehiculo> getVehiculo() {
        return Optional.ofNullable(vehiculo);
    }
}
