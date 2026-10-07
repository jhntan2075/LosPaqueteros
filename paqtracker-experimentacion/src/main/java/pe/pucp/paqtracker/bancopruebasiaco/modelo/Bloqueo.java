package pe.pucp.paqtracker.bancopruebasiaco.modelo;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Corte vial con vigencia temporal (LE-036, LE-066). El archivo describe una
 * polilínea de tramos horizontales o verticales; el bloqueo inhabilita todos los
 * nodos que la polilínea recorre, entre {@code minutoInicio} y {@code minutoFin}.
 */
public record Bloqueo(int minutoInicio, int minutoFin, List<Nodo> polilinea, Set<Nodo> nodos) {

    public Bloqueo {
        polilinea = List.copyOf(polilinea);
        nodos = Set.copyOf(nodos);
    }

    /** Construye el bloqueo expandiendo la polilínea a nodos de la rejilla. */
    public static Bloqueo deVertices(int minutoInicio, int minutoFin, List<Nodo> vertices) {
        Set<Nodo> nodos = new LinkedHashSet<>();
        for (int i = 0; i + 1 < vertices.size(); i++) {
            Nodo a = vertices.get(i);
            Nodo b = vertices.get(i + 1);
            if (a.x() == b.x()) {
                for (int y = Math.min(a.y(), b.y()); y <= Math.max(a.y(), b.y()); y++) {
                    nodos.add(new Nodo(a.x(), y));
                }
            } else {
                for (int x = Math.min(a.x(), b.x()); x <= Math.max(a.x(), b.x()); x++) {
                    nodos.add(new Nodo(x, a.y()));
                }
            }
        }
        return new Bloqueo(minutoInicio, minutoFin, new ArrayList<>(vertices), nodos);
    }

    public boolean vigenteEn(double minuto) {
        return minutoInicio <= minuto && minuto <= minutoFin;
    }
}
