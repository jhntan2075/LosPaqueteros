package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import java.util.ArrayList;
import java.util.List;

/**
 * Geometria de una unidad que avanza sobre el camino de un tramo (lista de vertices de una malla
 * ortogonal) a velocidad constante: su posicion y lo que le falta recorrer.
 */
public final class RecorridoCamino {

    /**
     * @param camino vertices del camino, de origen a destino
     * @param avance fraccion recorrida del tramo, entre 0 y 1 (se recorta a ese rango)
     * @return posicion sobre el camino
     */
    public static Coordenada posicion(List<Nodo> camino, double avance) {
        return restante(camino, avance).get(0);
    }

    /**
     * Lo que falta recorrer: la posicion actual seguida de los vertices aun no alcanzados. Es la ruta
     * depurada de lo ya recorrido (LE-092).
     *
     * @param camino vertices del camino, de origen a destino
     * @param avance fraccion recorrida del tramo, entre 0 y 1 (se recorta a ese rango)
     * @return posicion actual y vertices pendientes; nunca vacio
     */
    public static List<Coordenada> restante(List<Nodo> camino, double avance) {
        double longitud = longitud(camino);
        double objetivo = Math.min(1.0, Math.max(0.0, avance)) * longitud;
        List<Coordenada> resultado = new ArrayList<>();
        double acumulado = 0.0;
        for (int i = 1; i < camino.size() && resultado.isEmpty(); i++) {
            Nodo desde = camino.get(i - 1);
            Nodo hasta = camino.get(i);
            double segmento = desde.distanciaManhattan(hasta);
            if (acumulado + segmento > objetivo) {
                double fraccion = segmento == 0 ? 0.0 : (objetivo - acumulado) / segmento;
                resultado.add(new Coordenada(desde.getX() + (hasta.getX() - desde.getX()) * fraccion,
                        desde.getY() + (hasta.getY() - desde.getY()) * fraccion));
                for (int j = i; j < camino.size(); j++) {
                    resultado.add(coordenada(camino.get(j)));
                }
            }
            acumulado += segmento;
        }
        if (resultado.isEmpty()) {
            resultado.add(coordenada(camino.get(camino.size() - 1)));
        }
        return resultado;
    }

    /**
     * @param nodo nodo de la malla
     * @return su coordenada
     */
    public static Coordenada coordenada(Nodo nodo) {
        return new Coordenada(nodo.getX(), nodo.getY());
    }

    private static double longitud(List<Nodo> camino) {
        double total = 0.0;
        for (int i = 1; i < camino.size(); i++) {
            total += camino.get(i - 1).distanciaManhattan(camino.get(i));
        }
        return total;
    }

    private RecorridoCamino() {
    }
}
