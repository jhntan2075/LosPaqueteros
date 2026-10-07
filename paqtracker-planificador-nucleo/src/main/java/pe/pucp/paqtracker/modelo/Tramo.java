package pe.pucp.paqtracker.modelo;

/**
 * Tramo del recorrido de una unidad despachada: de donde sale, a donde llega,
 * en que minutos y con que distancia. Es lo que necesita el visualizador para
 * interpolar la posicion de la unidad sin recibir cada movimiento: conoce el
 * tramo en curso y el reloj, y calcula el punto intermedio.
 *
 * Los instantes son absolutos en minutos desde el inicio de la simulacion. La
 * llegada ya incluye la pausa de refrigerio si cae dentro del tramo.
 */
public final class Tramo {

    /** Valor de {@link #getIdPedido()} en los tramos que no atienden un pedido. */
    public static final int SIN_PEDIDO = -1;

    private final TipoTramo tipo;
    private final Nodo origen;
    private final Nodo destino;
    private final int salida;
    private final int llegada;
    private final int distancia;
    private final int idPedido;
    private final int cantidad;

    /**
     * @param tipo      naturaleza del tramo
     * @param origen    nodo de partida
     * @param destino   nodo de llegada
     * @param salida    instante de partida
     * @param llegada   instante de llegada
     * @param distancia kilometros recorridos en el tramo, considerando bloqueos
     * @param idPedido  pedido que atiende el tramo, o {@link #SIN_PEDIDO}
     * @param cantidad  paquetes que se entregan al terminar el tramo, cero si no hay entrega
     * @throws IllegalArgumentException si la llegada es anterior a la salida
     */
    public Tramo(TipoTramo tipo, Nodo origen, Nodo destino, int salida, int llegada,
                 int distancia, int idPedido, int cantidad) {
        if (llegada < salida) {
            throw new IllegalArgumentException(
                    "La llegada " + llegada + " es anterior a la salida " + salida);
        }
        this.tipo = tipo;
        this.origen = origen;
        this.destino = destino;
        this.salida = salida;
        this.llegada = llegada;
        this.distancia = distancia;
        this.idPedido = idPedido;
        this.cantidad = cantidad;
    }

    /**
     * Indica si la unidad esta recorriendo este tramo en el instante dado.
     *
     * @param instante instante a consultar
     * @return verdadero si el instante cae entre la salida (inclusive) y la llegada (exclusive)
     */
    public boolean estaEnCurso(int instante) {
        return instante >= salida && instante < llegada;
    }

    /**
     * Indica si con este tramo se completa la entrega de un pedido: es el
     * viaje que llega a su destino.
     *
     * @return verdadero si el tramo termina en una entrega
     */
    public boolean esEntrega() {
        return tipo == TipoTramo.VIAJE_A_ENTREGA && idPedido != SIN_PEDIDO;
    }

    public TipoTramo getTipo() {
        return tipo;
    }

    public Nodo getOrigen() {
        return origen;
    }

    public Nodo getDestino() {
        return destino;
    }

    public int getSalida() {
        return salida;
    }

    public int getLlegada() {
        return llegada;
    }

    public int getDistancia() {
        return distancia;
    }

    public int getIdPedido() {
        return idPedido;
    }

    public int getCantidad() {
        return cantidad;
    }
}
