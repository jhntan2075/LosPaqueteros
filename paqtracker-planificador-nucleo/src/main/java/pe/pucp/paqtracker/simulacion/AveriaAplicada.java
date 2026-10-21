package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Averia;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.List;

/**
 * Efecto de una averia al aplicarse en un paso de la simulacion. Existe para que quien conduce la
 * simulacion en vivo (la API) difunda la averia y actualice el seguimiento de los pedidos afectados
 * sin reconstruirlo comparando estados.
 *
 * @param averia              averia aplicada
 * @param vehiculo            unidad averiada
 * @param ubicacion           punto de la malla en que quedo inmovilizada
 * @param entregasLiberadas   entregas que llevaba y vuelven a planificarse (tipo 2 y 3); vacia en tipo 1
 * @param transitoInterrumpido recorrido que la unidad ejecutaba al averiarse, o null si estaba libre
 * @param transitoReanudado   recorrido con que sigue tras la detencion (tipo 1 en ruta): lo que le queda a
 *                            bordo o, si trasbordo todo, la vuelta a su almacen; null en los demas casos
 * @param trasbordos          entregas urgentes que pasan a unidades libres (tipo 1 en ruta); vacia si no hay
 * @param disponibleEn        instante en que vuelve a operar
 * @param trasladoEn          instante del traslado al almacen central, o {@link #SIN_TRASLADO} en tipo 1
 */
public record AveriaAplicada(Averia averia, Vehiculo vehiculo, Nodo ubicacion, List<Entrega> entregasLiberadas,
                             UnidadEnTransito transitoInterrumpido, UnidadEnTransito transitoReanudado,
                             List<Trasbordo> trasbordos, int disponibleEn, int trasladoEn) {

    /** Valor de {@code trasladoEn} cuando la averia no traslada la unidad al almacen central. */
    public static final int SIN_TRASLADO = -1;

    /**
     * Copia las listas para que el registro sea inmutable.
     */
    public AveriaAplicada {
        entregasLiberadas = List.copyOf(entregasLiberadas);
        trasbordos = List.copyOf(trasbordos);
    }

    /**
     * @return verdadero si la unidad sigue con carga a bordo tras la detencion
     */
    public boolean conservaCarga() {
        return transitoReanudado != null
                && !transitoReanudado.cortarEn(averia.getInstante()).entregasPendientes().isEmpty();
    }
}
