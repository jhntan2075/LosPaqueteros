package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.Nodo;
import java.util.List;

/**
 * Trasvase de entregas desde una unidad averiada a una unidad en ruta, que se desvia al punto de la
 * averia, recibe la carga y la entrega junto con la suya.
 *
 * @param receptora recorrido completo de la unidad que recibe la carga, ya con el desvio y las entregas
 * @param entregas  entregas trasvasadas, en el orden en que la receptora las visita
 * @param punto     punto de la malla en que se hace el trasvase
 * @param recojo    instante en que la receptora llega al punto y empieza el trasvase
 */
public record Trasbordo(UnidadEnTransito receptora, List<Entrega> entregas, Nodo punto, int recojo) {

    /**
     * Copia la lista de entregas para que el registro sea inmutable.
     */
    public Trasbordo {
        entregas = List.copyOf(entregas);
    }

    /**
     * @return instante en que la receptora llega al punto de la averia y empieza el trasvase
     */
    public int getRecojo() {
        return recojo;
    }
}
