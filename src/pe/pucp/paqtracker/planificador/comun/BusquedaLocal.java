package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Busqueda local que convierte el algoritmo en memetico. Aplica dos operadores
 * de vecindario sobre cada solucion tras el cruce y la mutacion:
 *
 * 2-opt (intra-ruta) invierte un segmento de una ruta cuando eso reduce su
 * distancia, eliminando los cruces que la ruta hace consigo misma.
 *
 * Or-opt (inter-ruta) mueve una cadena de una o dos entregas a otra ruta cuando
 * reduce la distancia total, con la restriccion de consolidar solo hacia
 * unidades de igual o menor capacidad para no vaciar las unidades pequenas
 * hacia los autos y preservar la diversidad de flota.
 *
 * Este bloque es compartido por todos los algoritmos metaheuristicos y no debe
 * duplicarse ni modificarse localmente.
 */
public final class BusquedaLocal {

    private static final int MAXIMO_VUELTAS = 8;
    private static final int LONGITUD_CADENA_MAXIMA = 2;

    /**
     * Optimiza la solucion aplicando los vecindarios hasta que no haya mejora.
     *
     * @param solucion solucion a optimizar en el lugar
     */
    public void optimizar(SolucionRuteo solucion) {
        boolean hayMejora = true;
        int vueltas = 0;
        while (hayMejora && vueltas < MAXIMO_VUELTAS) {
            hayMejora = false;
            vueltas++;
            for (Ruta ruta : solucion.getRutas()) {
                if (aplicarDosOpt(ruta)) {
                    hayMejora = true;
                }
            }
            if (aplicarOrOpt(solucion)) {
                hayMejora = true;
            }
        }
    }

    /**
     * Aplica 2-opt sobre una ruta: invierte el segmento que reduzca su
     * distancia.
     *
     * @param ruta ruta a optimizar
     * @return verdadero si se encontro alguna mejora
     */
    private boolean aplicarDosOpt(Ruta ruta) {
        if (ruta.getSecuencia().size() < 3) {
            return false;
        }
        boolean hayMejora = false;
        for (int i = 0; i < ruta.getSecuencia().size() - 1; i++) {
            for (int j = i + 1; j < ruta.getSecuencia().size(); j++) {
                double antes = costoRuta(ruta);
                Collections.reverse(ruta.getSecuencia().subList(i, j + 1));
                if (costoRuta(ruta) < antes - 0.001) {
                    hayMejora = true;
                } else {
                    Collections.reverse(ruta.getSecuencia().subList(i, j + 1));
                }
            }
        }
        return hayMejora;
    }

    /**
     * Aplica Or-opt: mueve una cadena corta de entregas a otra ruta de igual o
     * menor capacidad si eso reduce la distancia total.
     *
     * @param solucion solucion a optimizar
     * @return verdadero si se realizo algun movimiento de mejora
     */
    private boolean aplicarOrOpt(SolucionRuteo solucion) {
        for (Ruta origen : solucion.getRutas()) {
            for (int longitud = 1; longitud <= LONGITUD_CADENA_MAXIMA; longitud++) {
                if (moverCadenaDeLongitud(solucion, origen, longitud)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Intenta mover, desde la ruta origen, cadenas de la longitud dada hacia
     * otras rutas de igual o menor capacidad.
     *
     * @param solucion solucion a optimizar
     * @param origen   ruta desde la que se mueve
     * @param longitud longitud de la cadena a mover
     * @return verdadero si se realizo un movimiento de mejora
     */
    private boolean moverCadenaDeLongitud(SolucionRuteo solucion, Ruta origen, int longitud) {
        for (int i = 0; i + longitud <= origen.getSecuencia().size(); i++) {
            List<Entrega> cadena = new ArrayList<>(origen.getSecuencia().subList(i, i + longitud));
            int cargaCadena = 0;
            for (Entrega entrega : cadena) {
                cargaCadena += entrega.getCantidad();
            }
            if (intentarMoverCadena(solucion, origen, cadena, cargaCadena, i)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Intenta insertar una cadena en cada ruta candidata; revierte si no mejora.
     *
     * @param solucion    solucion a optimizar
     * @param origen      ruta desde la que se mueve la cadena
     * @param cadena      entregas a mover
     * @param cargaCadena carga total de la cadena
     * @param posicion    posicion original de la cadena en la ruta origen
     * @return verdadero si se realizo un movimiento de mejora
     */
    private boolean intentarMoverCadena(SolucionRuteo solucion, Ruta origen, List<Entrega> cadena,
                                        int cargaCadena, int posicion) {
        for (Ruta destino : solucion.getRutas()) {
            if (destino == origen) {
                continue;
            }
            if (destino.getVehiculo().getCapacidad() > origen.getVehiculo().getCapacidad()) {
                continue;
            }
            if (destino.getCarga() + cargaCadena > destino.getVehiculo().getCapacidad()) {
                continue;
            }
            double antes = costoRuta(origen) + costoRuta(destino);
            origen.getSecuencia().removeAll(cadena);
            destino.getSecuencia().addAll(cadena);
            if (costoRuta(origen) + costoRuta(destino) < antes - 0.001) {
                return true;
            }
            destino.getSecuencia().removeAll(cadena);
            origen.getSecuencia().addAll(posicion, cadena);
        }
        return false;
    }

    /**
     * Distancia de una ruta: origen, entregas en orden y almacen de destino.
     *
     * @param ruta ruta a medir
     * @return distancia de Manhattan de la ruta
     */
    private double costoRuta(Ruta ruta) {
        if (ruta.getSecuencia().isEmpty()) {
            return 0;
        }
        double costo = 0;
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (Entrega entrega : ruta.getSecuencia()) {
            costo += actual.distanciaManhattan(entrega.getDestino());
            actual = entrega.getDestino();
        }
        if (ruta.getDestino() != null) {
            costo += actual.distanciaManhattan(ruta.getDestino().getUbicacion());
        }
        return costo;
    }
}
