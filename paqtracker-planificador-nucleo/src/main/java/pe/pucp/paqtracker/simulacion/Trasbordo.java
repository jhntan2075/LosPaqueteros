package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.Nodo;
import java.util.List;

/**
 * Trasbordo de entregas urgentes desde una unidad con averia tipo 1 a una unidad libre, que sale de su
 * almacen, las recoge en el punto de la averia y las entrega.
 *
 * @param receptora recorrido de la unidad que recibe la carga: viaje al punto y entregas
 * @param entregas  entregas trasbordadas, en el orden en que la receptora las visita
 * @param punto     punto de la malla en que se hace el trasbordo
 */
public record Trasbordo(UnidadEnTransito receptora, List<Entrega> entregas, Nodo punto) {

    /**
     * Copia la lista de entregas para que el registro sea inmutable.
     */
    public Trasbordo {
        entregas = List.copyOf(entregas);
    }

    /**
     * @return instante en que la receptora llega al punto de la averia y recoge la carga
     */
    public int getRecojo() {
        return receptora.getTramos().get(0).getLlegada();
    }
}
