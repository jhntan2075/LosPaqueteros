package pe.pucp.paqtracker.modelo;

import java.util.ArrayList;
import java.util.List;

/**
 * Solucion candidata del planificador: un plan completo para un ciclo de
 * planificacion. Contiene las rutas asignadas a las unidades disponibles y la
 * cola de espera con las entregas que no alcanzaron a rutearse. Las entregas en
 * espera no se pierden: la funcion de fitness las penaliza segun su urgencia.
 *
 * Corresponde al cromosoma del algoritmo genetico.
 */
public final class SolucionRuteo {

    private final List<Ruta> rutas;
    private final List<Entrega> espera;
    private double fitness;

    /**
     * Crea una solucion vacia con fitness maximo (la peor posible).
     */
    public SolucionRuteo() {
        this.rutas = new ArrayList<>();
        this.espera = new ArrayList<>();
        this.fitness = Double.MAX_VALUE;
    }

    /**
     * Crea una copia independiente de esta solucion.
     *
     * @return copia con rutas, cola de espera y fitness clonados
     */
    public SolucionRuteo copiar() {
        SolucionRuteo copia = new SolucionRuteo();
        for (Ruta ruta : rutas) {
            copia.rutas.add(ruta.copiar());
        }
        copia.espera.addAll(espera);
        copia.fitness = this.fitness;
        return copia;
    }

    public List<Ruta> getRutas() {
        return rutas;
    }

    public List<Entrega> getEspera() {
        return espera;
    }

    public double getFitness() {
        return fitness;
    }

    public void setFitness(double fitness) {
        this.fitness = fitness;
    }

    /**
     * Devuelve todas las entregas actualmente ruteadas en la solucion.
     *
     * @return lista de entregas presentes en alguna ruta
     */
    public List<Entrega> obtenerEntregasRuteadas() {
        List<Entrega> ruteadas = new ArrayList<>();
        for (Ruta ruta : rutas) {
            ruteadas.addAll(ruta.getSecuencia());
        }
        return ruteadas;
    }
}
