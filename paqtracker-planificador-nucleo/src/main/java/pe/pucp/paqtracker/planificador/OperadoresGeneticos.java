package pe.pucp.paqtracker.planificador;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.planificador.comun.InventarioProyectado;
import pe.pucp.paqtracker.planificador.comun.Reparador;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Operadores geneticos del algoritmo genetico: seleccion por torneo, cruce
 * basado en rutas y mutacion con tres variantes. Estos operadores son propios
 * del GA, a diferencia de la construccion, reparacion, busqueda local y fitness,
 * que son bloques compartidos.
 */
public final class OperadoresGeneticos {

    private static final int VARIANTES_MUTACION = 3;

    private final EscenarioOperativo escenario;
    private final Reparador reparador;
    private final Random random;

    /**
     * @param escenario escenario operativo
     * @param reparador reparador compartido para reubicar entregas
     * @param random    generador aleatorio con semilla fija
     */
    public OperadoresGeneticos(EscenarioOperativo escenario, Reparador reparador, Random random) {
        this.escenario = escenario;
        this.reparador = reparador;
        this.random = random;
    }

    /**
     * Selecciona un progenitor por torneo: toma k individuos al azar y conserva
     * el de mejor fitness.
     *
     * @param poblacion poblacion actual
     * @param tamanoTorneo cantidad de individuos que compiten
     * @return progenitor seleccionado
     */
    public SolucionRuteo seleccionarPorTorneo(List<SolucionRuteo> poblacion, int tamanoTorneo) {
        SolucionRuteo mejor = poblacion.get(random.nextInt(poblacion.size()));
        for (int i = 1; i < tamanoTorneo; i++) {
            SolucionRuteo retador = poblacion.get(random.nextInt(poblacion.size()));
            if (retador.getFitness() < mejor.getFitness()) {
                mejor = retador;
            }
        }
        return mejor;
    }

    /**
     * Cruce basado en rutas: dona una ruta completa de un progenitor al otro,
     * elimina duplicados y reinserta por urgencia las entregas sin rutear.
     *
     * @param primero  primer progenitor (aporta la ruta donada)
     * @param segundo  segundo progenitor (base del hijo)
     * @return solucion hija
     */
    public SolucionRuteo cruzar(SolucionRuteo primero, SolucionRuteo segundo) {
        SolucionRuteo hijo = segundo.copiar();
        if (primero.getRutas().isEmpty()) {
            return hijo;
        }
        Ruta donada = primero.getRutas().get(random.nextInt(primero.getRutas().size())).copiar();
        Set<Integer> idsDonados = new HashSet<>();
        for (Entrega entrega : donada.getSecuencia()) {
            idsDonados.add(entrega.getId());
        }
        for (Ruta ruta : hijo.getRutas()) {
            ruta.getSecuencia().removeIf(entrega -> idsDonados.contains(entrega.getId()));
        }
        hijo.getEspera().removeIf(entrega -> idsDonados.contains(entrega.getId()));
        hijo.getRutas().removeIf(ruta -> ruta.getVehiculo().getId() == donada.getVehiculo().getId());
        hijo.getRutas().add(donada);
        reinsertarFaltantes(hijo);
        hijo.getRutas().removeIf(ruta -> ruta.getSecuencia().isEmpty());
        return hijo;
    }

    /**
     * Reinserta en el hijo, por orden de urgencia, las entregas que quedaron sin
     * rutear tras el cruce; las que no caben pasan a la cola de espera.
     *
     * @param hijo solucion hija a completar
     */
    private void reinsertarFaltantes(SolucionRuteo hijo) {
        Set<Integer> presentes = new HashSet<>();
        for (Entrega entrega : hijo.obtenerEntregasRuteadas()) {
            presentes.add(entrega.getId());
        }
        for (Entrega entrega : hijo.getEspera()) {
            presentes.add(entrega.getId());
        }
        List<Entrega> faltantes = new ArrayList<>();
        for (Entrega entrega : escenario.getEntregas()) {
            if (!presentes.contains(entrega.getId())) {
                faltantes.add(entrega);
            }
        }
        faltantes.sort(Comparator.comparingInt(Entrega::getPlazo));
        for (Entrega entrega : faltantes) {
            if (!reparador.reubicar(hijo, entrega)) {
                hijo.getEspera().add(entrega);
            }
        }
    }

    /**
     * Aplica una mutacion aleatoria al individuo: intercambio dentro de una
     * ruta, rescate de una entrega en espera o cambio de almacen de destino.
     *
     * @param solucion solucion a mutar en el lugar
     */
    public void mutar(SolucionRuteo solucion) {
        switch (random.nextInt(VARIANTES_MUTACION)) {
            case 0:
                intercambiarEnRuta(solucion);
                break;
            case 1:
                rescatarDeEspera(solucion);
                break;
            default:
                cambiarDestino(solucion);
                break;
        }
    }

    /**
     * Intercambia la posicion de dos entregas dentro de una misma ruta.
     *
     * @param solucion solucion a mutar
     */
    private void intercambiarEnRuta(SolucionRuteo solucion) {
        List<Ruta> validas = new ArrayList<>();
        for (Ruta ruta : solucion.getRutas()) {
            if (ruta.getSecuencia().size() >= 2) {
                validas.add(ruta);
            }
        }
        if (validas.isEmpty()) {
            return;
        }
        Ruta ruta = validas.get(random.nextInt(validas.size()));
        Collections.swap(ruta.getSecuencia(),
                random.nextInt(ruta.getSecuencia().size()),
                random.nextInt(ruta.getSecuencia().size()));
    }

    /**
     * Toma una entrega de la cola de espera e intenta insertarla en una ruta.
     *
     * @param solucion solucion a mutar
     */
    private void rescatarDeEspera(SolucionRuteo solucion) {
        if (solucion.getEspera().isEmpty()) {
            return;
        }
        Entrega entrega = solucion.getEspera().get(random.nextInt(solucion.getEspera().size()));
        if (reparador.reubicar(solucion, entrega)) {
            solucion.getEspera().remove(entrega);
        }
    }

    /**
     * Reasigna el almacen de destino de una ruta entre los que tienen stock.
     *
     * @param solucion solucion a mutar
     */
    private void cambiarDestino(SolucionRuteo solucion) {
        if (solucion.getRutas().isEmpty()) {
            return;
        }
        Ruta ruta = solucion.getRutas().get(random.nextInt(solucion.getRutas().size()));
        Map<Integer, Integer> stock = InventarioProyectado.calcular(solucion, escenario);
        List<Almacen> validos = new ArrayList<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            if (almacen.esIlimitado() || stock.get(almacen.getId()) > 0) {
                validos.add(almacen);
            }
        }
        if (!validos.isEmpty()) {
            ruta.setDestino(validos.get(random.nextInt(validos.size())));
        }
    }
}
