package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import pe.pucp.paqtracker.util.CalendarioTurnos;
import pe.pucp.paqtracker.util.Malla;
import java.util.Comparator;
import java.util.List;

/**
 * Ultima revision de una ruta del plan antes de que su unidad salga. Retiene en la cola, para el ciclo
 * siguiente, las entregas que no conviene despachar ahora:
 *
 * las que llegarian fuera de plazo mientras el pedido todavia puede esperar un ciclo y ser atendido a
 * tiempo. El planificador solo ve las unidades libres del ciclo: con las rapidas en ruta, asigna la
 * entrega a una lenta que llega tarde aunque en el ciclo siguiente vuelva una que llegaria a tiempo.
 * Como el colapso se declara con la primera entrega tardia (LE-067), despacharla ya lo consuma,
 * mientras que retenerla conserva la posibilidad de cumplir;
 *
 * y las que no tienen camino por los bloqueos vigentes, porque la unidad no podria llegar.
 *
 * No cambia la funcion objetivo ni los parametros del planificador: actua sobre el plan ya elegido.
 */
final class FiltroDespacho {

    private final List<Almacen> almacenes;
    private final Vehiculo unidadMasRapida;
    private final int saMinutos;

    /**
     * @param almacenes almacenes de la operacion
     * @param flota     flota completa, para conocer la unidad mas rapida
     * @param saMinutos salto del algoritmo: lo que espera una entrega retenida hasta el siguiente plan
     */
    FiltroDespacho(List<Almacen> almacenes, List<Vehiculo> flota, int saMinutos) {
        this.almacenes = almacenes;
        this.unidadMasRapida = flota.stream().max(Comparator.comparingInt(Vehiculo::getVelocidad)).orElseThrow();
        this.saMinutos = saMinutos;
    }

    /**
     * Quita de la ruta las entregas que no conviene despachar en este ciclo. Si la ruta queda sin
     * entregas, o sin un almacen de retorno alcanzable, queda vacia y su unidad no sale.
     *
     * @param ruta      ruta del plan; se modifica en el lugar
     * @param escenario escenario del ciclo, con la malla vigente
     * @param instante  instante de salida
     */
    void retener(Ruta ruta, EscenarioOperativo escenario, int instante) {
        Entrega retenida = primeraPorRetener(ruta, escenario, instante);
        while (retenida != null) {
            ruta.getSecuencia().remove(retenida);
            retenida = primeraPorRetener(ruta, escenario, instante);
        }
        if (!ruta.getSecuencia().isEmpty() && !asegurarRetorno(ruta, escenario, instante)) {
            ruta.getSecuencia().clear();
        }
    }

    /**
     * Recorre la ruta con sus tiempos reales y devuelve la primera entrega que hay que retener. Al
     * quitarla cambian las llegadas de las siguientes, por eso se retiene de una en una.
     *
     * @return entrega por retener, o null si la ruta puede salir como esta
     */
    private Entrega primeraPorRetener(Ruta ruta, EscenarioOperativo escenario, int instante) {
        int reloj = instante;
        int idVehiculo = ruta.getVehiculo().getId();
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (Entrega entrega : ruta.getSecuencia()) {
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj,
                    ruta.getVehiculo());
            if (!Malla.hayCamino(tramo)) {
                return entrega;
            }
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo()));
            if (reloj > entrega.getHoraLimite() && puedeEsperar(entrega, instante)) {
                return entrega;
            }
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
        return null;
    }

    /**
     * Indica si la entrega todavia llegaria a tiempo saliendo en el ciclo siguiente, en el mejor caso:
     * la unidad mas rapida de la flota desde el almacen mas cercano. Si ni asi llega, retenerla no
     * salva nada y se despacha ahora para que el retraso sea el menor posible.
     *
     * @param entrega  entrega que llegaria tarde en la ruta actual
     * @param instante instante del ciclo
     * @return verdadero si esperar un ciclo aun permite cumplir el plazo
     */
    private boolean puedeEsperar(Entrega entrega, int instante) {
        int cercano = Integer.MAX_VALUE;
        for (Almacen almacen : almacenes) {
            cercano = Math.min(cercano, almacen.getUbicacion().distanciaManhattan(entrega.getDestino()));
        }
        int viaje = CalculadoraTiempos.minutosDeViaje(cercano, unidadMasRapida);
        return instante + saMinutos + viaje <= entrega.getHoraLimite();
    }

    /**
     * Comprueba que la unidad pueda volver al almacen de retorno; si los bloqueos lo impiden, lo cambia
     * por el almacen alcanzable mas cercano.
     *
     * @return falso si la unidad no podria volver a ningun almacen
     */
    private boolean asegurarRetorno(Ruta ruta, EscenarioOperativo escenario, int instante) {
        int[] recorrido = CalculadoraTiempos.recorrer(escenario, ruta, instante);
        if (Malla.hayCamino(recorrido[CalculadoraTiempos.INDICE_DISTANCIA])) {
            return true;
        }
        Almacen mejor = null;
        int menor = Malla.DISTANCIA_SIN_CAMINO;
        for (Almacen almacen : almacenes) {
            ruta.setDestino(almacen);
            int distancia = CalculadoraTiempos.recorrer(escenario, ruta, instante)[CalculadoraTiempos.INDICE_DISTANCIA];
            if (distancia < menor) {
                menor = distancia;
                mejor = almacen;
            }
        }
        if (mejor != null) {
            ruta.setDestino(mejor);
        }
        return mejor != null;
    }
}
