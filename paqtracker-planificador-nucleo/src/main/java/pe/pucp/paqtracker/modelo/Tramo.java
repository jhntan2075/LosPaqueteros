package pe.pucp.paqtracker.modelo;

import pe.pucp.paqtracker.util.Malla;
import java.util.ArrayList;
import java.util.List;

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
    private final List<Nodo> camino;

    /**
     * Crea un tramo cuyo camino es el de Manhattan en L (primero el eje x).
     *
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
        this(tipo, origen, destino, salida, llegada, distancia, idPedido, cantidad,
                Malla.caminoEnL(origen, destino));
    }

    /**
     * @param tipo      naturaleza del tramo
     * @param origen    nodo de partida
     * @param destino   nodo de llegada
     * @param salida    instante de partida
     * @param llegada   instante de llegada
     * @param distancia kilometros recorridos en el tramo, considerando bloqueos
     * @param idPedido  pedido que atiende el tramo, o {@link #SIN_PEDIDO}
     * @param cantidad  paquetes que se entregan al terminar el tramo, cero si no hay entrega
     * @param camino    vertices del camino real, de origen a destino (rodea los bloqueos vigentes)
     * @throws IllegalArgumentException si la llegada es anterior a la salida o el camino esta vacio
     */
    public Tramo(TipoTramo tipo, Nodo origen, Nodo destino, int salida, int llegada,
                 int distancia, int idPedido, int cantidad, List<Nodo> camino) {
        if (llegada < salida) {
            throw new IllegalArgumentException(
                    "La llegada " + llegada + " es anterior a la salida " + salida);
        }
        if (camino == null || camino.isEmpty()) {
            throw new IllegalArgumentException("El camino del tramo no puede estar vacio: " + camino);
        }
        this.tipo = tipo;
        this.origen = origen;
        this.destino = destino;
        this.salida = salida;
        this.llegada = llegada;
        this.distancia = distancia;
        this.idPedido = idPedido;
        this.cantidad = cantidad;
        this.camino = List.copyOf(camino);
    }

    /**
     * @return vertices del camino del tramo, de origen a destino, inmodificables
     */
    public List<Nodo> getCamino() {
        return camino;
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

    /**
     * Kilometros del camino que la unidad ya recorrio en el instante dado. Supone avance uniforme en
     * el tiempo, igual que el visualizador al interpolar, y se queda en el ultimo nodo alcanzado.
     *
     * @param instante instante a consultar
     * @return kilometros recorridos, entre cero y la longitud del camino
     */
    public int kilometrosEn(int instante) {
        int longitud = longitudCamino();
        if (instante >= llegada) {
            return longitud;
        }
        if (instante <= salida) {
            return 0;
        }
        return (int) ((long) longitud * (instante - salida) / (llegada - salida));
    }

    /**
     * @param instante instante a consultar
     * @return nodo del camino en que se encuentra la unidad en ese instante
     */
    public Nodo ubicacionEn(int instante) {
        return puntoDelCamino(kilometrosEn(instante));
    }

    /**
     * Parte de este tramo recorrida hasta un instante, para cortar el recorrido en una averia. Si el
     * tramo es el viaje a una entrega, la parte recortada ya no la completa: se marca sin pedido para
     * que no cuente como entrega.
     *
     * @param instante instante del corte, dentro del tramo
     * @return tramo desde la salida hasta la posicion en ese instante
     */
    public Tramo recortarHasta(int instante) {
        int kilometros = kilometrosEn(instante);
        boolean viaje = tipo == TipoTramo.VIAJE_A_ENTREGA;
        return new Tramo(tipo, origen, puntoDelCamino(kilometros), salida, instante, kilometros,
                viaje ? SIN_PEDIDO : idPedido, viaje ? 0 : cantidad, caminoHasta(kilometros));
    }

    /**
     * Parte de este tramo que falta recorrer desde un instante, desplazada en el tiempo. La unidad la
     * retoma desde la posicion que tenia en ese instante, despues de una detencion.
     *
     * @param instante       instante del corte, dentro del tramo
     * @param desplazamiento minutos que la unidad estuvo detenida
     * @return tramo desde la posicion del corte hasta el destino, con sus instantes desplazados
     */
    public Tramo restoDesde(int instante, int desplazamiento) {
        int kilometros = kilometrosEn(instante);
        return new Tramo(tipo, puntoDelCamino(kilometros), destino, instante + desplazamiento,
                llegada + desplazamiento, Math.max(0, distancia - kilometros), idPedido, cantidad,
                caminoDesde(kilometros));
    }

    /**
     * @param desplazamiento minutos a desplazar
     * @return el mismo tramo, con salida y llegada desplazadas
     */
    public Tramo desplazar(int desplazamiento) {
        return new Tramo(tipo, origen, destino, salida + desplazamiento, llegada + desplazamiento, distancia,
                idPedido, cantidad, camino);
    }

    private int longitudCamino() {
        int total = 0;
        for (int i = 1; i < camino.size(); i++) {
            total += camino.get(i - 1).distanciaManhattan(camino.get(i));
        }
        return total;
    }

    private Nodo puntoDelCamino(int kilometros) {
        List<Nodo> hasta = caminoHasta(kilometros);
        return hasta.get(hasta.size() - 1);
    }

    /** Vertices desde el origen hasta el punto a esa distancia, que cierra la lista. */
    private List<Nodo> caminoHasta(int kilometros) {
        List<Nodo> vertices = new ArrayList<>();
        vertices.add(camino.get(0));
        int restante = kilometros;
        for (int i = 1; i < camino.size() && restante > 0; i++) {
            Nodo desde = camino.get(i - 1);
            Nodo hasta = camino.get(i);
            int segmento = desde.distanciaManhattan(hasta);
            vertices.add(restante >= segmento ? hasta : avanzar(desde, hasta, restante));
            restante -= segmento;
        }
        return vertices;
    }

    /** El punto a esa distancia seguido de los vertices que aun no alcanza. */
    private List<Nodo> caminoDesde(int kilometros) {
        List<Nodo> hasta = caminoHasta(kilometros);
        List<Nodo> vertices = new ArrayList<>();
        vertices.add(hasta.get(hasta.size() - 1));
        for (int i = hasta.size() - 1; i < camino.size(); i++) {
            if (!camino.get(i).equals(vertices.get(vertices.size() - 1))) {
                vertices.add(camino.get(i));
            }
        }
        return vertices;
    }

    /** Avanza desde un vertice hacia el siguiente, primero en x y luego en y, como el camino en L. */
    private static Nodo avanzar(Nodo desde, Nodo hasta, int kilometros) {
        int pasoX = Math.min(kilometros, Math.abs(hasta.getX() - desde.getX()));
        int pasoY = kilometros - pasoX;
        return new Nodo(desde.getX() + Integer.signum(hasta.getX() - desde.getX()) * pasoX,
                desde.getY() + Integer.signum(hasta.getY() - desde.getY()) * pasoY);
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
