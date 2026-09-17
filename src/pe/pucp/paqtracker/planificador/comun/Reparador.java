package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import pe.pucp.paqtracker.util.CalendarioTurnos;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Garantiza las restricciones duras de una solucion antes de evaluarla, en
 * cuatro fases: capacidad de la unidad, stock del almacen de salida, validez
 * del almacen de destino y reordenamiento por plazo. Las tres primeras siempre
 * son reparables (se mueve una entrega o se cambia el almacen), por lo que no
 * aparecen en la funcion de fitness. La cuarta se aplica de forma condicional.
 *
 * No hay una fase de cierre de turno: ante un cambio de turno el conductor
 * alcanza a la unidad en el punto en que se encuentre, con tiempo de relevo
 * despreciable, asi que una ruta puede cruzar el cambio de turno sin volver a
 * un almacen. El refrigerio si detiene la unidad (ver
 * {@link pe.pucp.paqtracker.util.CalendarioTurnos}), pero es una restriccion
 * de tiempo, no de cierre de ruta, y ya la aplica {@link CalculadoraTiempos}.
 *
 * Este bloque es compartido por todos los algoritmos metaheuristicos y no debe
 * duplicarse ni modificarse localmente.
 */
public final class Reparador {

    private final EscenarioOperativo escenario;

    /**
     * @param escenario escenario operativo sobre el que se repara
     */
    public Reparador(EscenarioOperativo escenario) {
        this.escenario = escenario;
    }

    /**
     * Repara la solucion aplicando las cuatro fases en orden.
     *
     * @param solucion solucion a reparar en el lugar
     */
    public void reparar(SolucionRuteo solucion) {
        repararCapacidad(solucion);
        repararStockOrigen(solucion);
        repararDestino(solucion);
        repararPlazoCondicional(solucion);
        solucion.getRutas().removeIf(ruta -> ruta.getSecuencia().isEmpty());
    }

    /**
     * Fase 1: extrae de cada ruta sobrecargada la entrega mas lejana del origen
     * y la reubica; si no cabe en ninguna, la envia a la cola de espera.
     *
     * @param solucion solucion a reparar
     */
    private void repararCapacidad(SolucionRuteo solucion) {
        for (Ruta ruta : new ArrayList<>(solucion.getRutas())) {
            while (ruta.getCarga() > ruta.getVehiculo().getCapacidad()
                    && !ruta.getSecuencia().isEmpty()) {
                Entrega fuera = extraerMasLejana(ruta);
                if (!reubicar(solucion, fuera)) {
                    solucion.getEspera().add(fuera);
                }
            }
        }
    }

    /**
     * Fase 2: asegura que lo despachado desde cada almacen no exceda su stock.
     *
     * @param solucion solucion a reparar
     */
    private void repararStockOrigen(SolucionRuteo solucion) {
        Map<Integer, Integer> stock = new HashMap<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            stock.put(almacen.getId(),
                    almacen.esIlimitado() ? Integer.MAX_VALUE : almacen.getStockInicial());
        }
        for (Ruta ruta : new ArrayList<>(solucion.getRutas())) {
            if (ruta.getOrigen().esIlimitado()) {
                continue;
            }
            int disponible = stock.get(ruta.getOrigen().getId());
            while (ruta.getCarga() > disponible && !ruta.getSecuencia().isEmpty()) {
                Entrega fuera = extraerMasLejana(ruta);
                if (!reubicar(solucion, fuera)) {
                    solucion.getEspera().add(fuera);
                }
            }
            stock.put(ruta.getOrigen().getId(), disponible - ruta.getCarga());
        }
    }

    /**
     * Fase 3: reasigna el almacen de destino de cada ruta a uno con stock
     * proyectado positivo si el actual ya no lo tiene.
     *
     * @param solucion solucion a reparar
     */
    private void repararDestino(SolucionRuteo solucion) {
        Map<Integer, Integer> stock = InventarioProyectado.calcular(solucion, escenario);
        for (Ruta ruta : solucion.getRutas()) {
            if (ruta.getSecuencia().isEmpty()) {
                continue;
            }
            Nodo ultimo = ruta.getSecuencia().get(ruta.getSecuencia().size() - 1).getDestino();
            boolean invalido = ruta.getDestino() == null
                    || (!ruta.getDestino().esIlimitado() && stock.get(ruta.getDestino().getId()) <= 0);
            if (invalido) {
                ruta.setDestino(almacenValido(ultimo, stock));
            }
        }
    }

    /**
     * Fase 4: reordena cada ruta por hora limite ascendente solo si presenta
     * algun incumplimiento, y revierte el reordenamiento si empeora. Aplicarlo
     * siempre agregaria distancia sin necesidad, porque ignora la geografia.
     *
     * @param solucion solucion a reparar
     */
    private void repararPlazoCondicional(SolucionRuteo solucion) {
        for (Ruta ruta : solucion.getRutas()) {
            if (ruta.getSecuencia().size() < 2) {
                continue;
            }
            int antes = contarIncumplimientos(ruta.getSecuencia(), ruta);
            if (antes == 0) {
                continue;
            }
            List<Entrega> original = new ArrayList<>(ruta.getSecuencia());
            ruta.getSecuencia().sort(Comparator.comparingInt(Entrega::getHoraLimite));
            if (contarIncumplimientos(ruta.getSecuencia(), ruta) > antes) {
                ruta.getSecuencia().clear();
                ruta.getSecuencia().addAll(original);
            }
        }
    }

    /**
     * Almacen mas cercano con stock proyectado positivo; el central siempre
     * sirve por ser ilimitado.
     *
     * @param desde nodo desde el cual se busca
     * @param stock stock proyectado por almacen
     * @return almacen de retorno valido
     */
    public Almacen almacenValido(Nodo desde, Map<Integer, Integer> stock) {
        Almacen mejor = null;
        int minima = Integer.MAX_VALUE;
        for (Almacen almacen : escenario.getAlmacenes()) {
            if (!almacen.esIlimitado() && stock.get(almacen.getId()) <= 0) {
                continue;
            }
            int distancia = desde.distanciaManhattan(almacen.getUbicacion());
            if (distancia < minima) {
                minima = distancia;
                mejor = almacen;
            }
        }
        if (mejor == null) {
            for (Almacen almacen : escenario.getAlmacenes()) {
                if (almacen.esIlimitado()) {
                    return almacen;
                }
            }
        }
        return mejor;
    }

    /**
     * Intenta colocar una entrega en una ruta existente con holgura, o abre una
     * ruta nueva en la unidad disponible de menor capacidad suficiente.
     *
     * @param solucion solucion sobre la que se reubica
     * @param entrega  entrega a colocar
     * @return verdadero si la entrega pudo colocarse
     */
    public boolean reubicar(SolucionRuteo solucion, Entrega entrega) {
        Map<Integer, Integer> stock = InventarioProyectado.calcular(solucion, escenario);
        if (reubicarEnRutaExistente(solucion, entrega, stock)) {
            return true;
        }
        return abrirRutaNueva(solucion, entrega, stock);
    }

    /**
     * Intenta colocar la entrega en una ruta existente con capacidad y stock.
     *
     * @param solucion solucion sobre la que se reubica
     * @param entrega  entrega a colocar
     * @param stock    stock proyectado por almacen
     * @return verdadero si la entrega se coloco en una ruta existente
     */
    private boolean reubicarEnRutaExistente(SolucionRuteo solucion, Entrega entrega,
                                            Map<Integer, Integer> stock) {
        for (Ruta ruta : solucion.getRutas()) {
            boolean cabeCapacidad = ruta.getCarga() + entrega.getCantidad()
                    <= ruta.getVehiculo().getCapacidad();
            boolean cabeStock = ruta.getOrigen().esIlimitado()
                    || stock.get(ruta.getOrigen().getId()) >= entrega.getCantidad();
            if (cabeCapacidad && cabeStock) {
                ruta.getSecuencia().add(entrega);
                return true;
            }
        }
        return false;
    }

    /**
     * Abre una ruta nueva en la unidad disponible de menor capacidad suficiente.
     *
     * @param solucion solucion sobre la que se reubica
     * @param entrega  entrega a colocar
     * @param stock    stock proyectado por almacen
     * @return verdadero si se abrio una ruta nueva para la entrega
     */
    private boolean abrirRutaNueva(SolucionRuteo solucion, Entrega entrega,
                                   Map<Integer, Integer> stock) {
        Set<Integer> usados = new HashSet<>();
        for (Ruta ruta : solucion.getRutas()) {
            usados.add(ruta.getVehiculo().getId());
        }
        List<Vehiculo> libres = new ArrayList<>();
        for (Vehiculo vehiculo : escenario.getFlotaDisponible()) {
            if (vehiculo.estaDisponible() && !usados.contains(vehiculo.getId())
                    && vehiculo.getCapacidad() >= entrega.getCantidad()) {
                libres.add(vehiculo);
            }
        }
        libres.sort(Comparator.comparingInt(Vehiculo::getCapacidad));
        for (Vehiculo vehiculo : libres) {
            if (!vehiculo.getPosicion().esIlimitado()
                    && stock.get(vehiculo.getPosicion().getId()) < entrega.getCantidad()) {
                continue;
            }
            Ruta nueva = new Ruta(vehiculo, vehiculo.getPosicion());
            nueva.getSecuencia().add(entrega);
            nueva.setDestino(almacenValido(entrega.getDestino(), stock));
            solucion.getRutas().add(nueva);
            return true;
        }
        return false;
    }

    /**
     * Extrae de la ruta la entrega mas lejana de su almacen de origen.
     *
     * @param ruta ruta de la que se extrae
     * @return entrega extraida
     */
    private Entrega extraerMasLejana(Ruta ruta) {
        Entrega lejana = null;
        int maxima = -1;
        for (Entrega entrega : ruta.getSecuencia()) {
            int distancia = ruta.getOrigen().getUbicacion().distanciaManhattan(entrega.getDestino());
            if (distancia > maxima) {
                maxima = distancia;
                lejana = entrega;
            }
        }
        ruta.getSecuencia().remove(lejana);
        return lejana;
    }

    /**
     * Cuenta los incumplimientos de una secuencia de entregas en una ruta.
     *
     * @param secuencia secuencia de entregas a evaluar
     * @param ruta      ruta que las ejecuta
     * @return numero de entregas que llegan tarde
     */
    private int contarIncumplimientos(List<Entrega> secuencia, Ruta ruta) {
        Nodo actual = ruta.getOrigen().getUbicacion();
        int reloj = escenario.getInstanteActual();
        int idVehiculo = ruta.getVehiculo().getId();
        int incumplimientos = 0;
        for (Entrega entrega : secuencia) {
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj);
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            if (reloj > entrega.getHoraLimite()) {
                incumplimientos++;
            }
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
        return incumplimientos;
    }
}
