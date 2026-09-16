package pe.pucp.paqtracker.modelo;

import java.util.Set;

/**
 * Bloqueo programado de vias. Durante su ventana de vigencia, el conjunto de
 * nodos que lo componen queda intransitable. Los bloqueos se conocen de
 * antemano, de modo que el planificador los consulta al calcular rutas en lugar
 * de reaccionar a ellos.
 */
public final class Bloqueo {

    private final int instanteInicio;
    private final int instanteFin;
    private final Set<Long> nodosBloqueados;

    /**
     * @param instanteInicio  minuto absoluto en que inicia el bloqueo
     * @param instanteFin     minuto absoluto en que termina el bloqueo
     * @param nodosBloqueados nodos intransitables, codificados como clave larga
     */
    public Bloqueo(int instanteInicio, int instanteFin, Set<Long> nodosBloqueados) {
        this.instanteInicio = instanteInicio;
        this.instanteFin = instanteFin;
        this.nodosBloqueados = nodosBloqueados;
    }

    /**
     * @return minuto absoluto en que inicia el bloqueo
     */
    public int getInstanteInicio() {
        return instanteInicio;
    }

    /**
     * @return minuto absoluto en que termina el bloqueo
     */
    public int getInstanteFin() {
        return instanteFin;
    }

    /**
     * @return nodos intransitables, codificados como clave larga
     */
    public Set<Long> getNodosBloqueados() {
        return nodosBloqueados;
    }

    /**
     * Indica si el bloqueo esta vigente en el instante dado.
     *
     * @param instante minuto absoluto a consultar
     * @return verdadero si el instante cae dentro de la ventana de vigencia
     */
    public boolean estaVigente(int instante) {
        return instante >= instanteInicio && instante <= instanteFin;
    }
}
