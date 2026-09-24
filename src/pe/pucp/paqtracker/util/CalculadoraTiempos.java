package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.util.ArrayList;
import java.util.List;

/**
 * Calculo unificado de distancias y tiempos de una ruta. Considera la velocidad
 * del tipo de unidad, los bloqueos vigentes en el instante en que se recorre
 * cada tramo y el tiempo de acondicionamiento por entrega. Todas las capas del
 * planificador usan esta clase para que el calculo sea consistente.
 */
public final class CalculadoraTiempos {

    /** Indice del resultado: distancia total recorrida. */
    public static final int INDICE_DISTANCIA = 0;

    /** Indice del resultado: instante en que la unidad vuelve a estar libre. */
    public static final int INDICE_FIN = 1;

    /** Indice del resultado: numero de incumplimientos de plazo. */
    public static final int INDICE_INCUMPLIMIENTOS = 2;

    /** Indice del resultado: holgura minima observada, en minutos. */
    public static final int INDICE_HOLGURA_MINIMA = 3;

    /**
     * Distancia de un tramo entre dos nodos, considerando bloqueos si el
     * escenario tiene malla.
     *
     * @param escenario escenario operativo con la malla vigente
     * @param origen    nodo de partida
     * @param destino   nodo de llegada
     * @param instante  minuto absoluto en que se recorre el tramo
     * @return distancia del tramo
     */
    public static int distancia(EscenarioOperativo escenario, Nodo origen, Nodo destino, int instante) {
        if (escenario.getMalla() == null) {
            return origen.distanciaManhattan(destino);
        }
        return escenario.getMalla().distancia(origen, destino, instante);
    }

    /**
     * Minutos de viaje de un tramo segun el tipo de unidad.
     *
     * @param distanciaKilometros distancia del tramo
     * @param tipo                tipo de unidad
     * @return minutos de viaje, redondeados hacia arriba
     */
    public static int minutosDeViaje(int distanciaKilometros, TipoVehiculo tipo) {
        return (int) Math.ceil(distanciaKilometros * 60.0 / tipo.getVelocidad());
    }

    /**
     * Recorre una ruta desde el instante de salida y calcula distancia total,
     * instante de retorno, incumplimientos de plazo y holgura minima.
     *
     * El plazo se evalua con la hora de llegada a cada entrega, antes de sumar
     * el tiempo de acondicionamiento: una entrega que llega dentro de plazo se
     * considera cumplida aunque la unidad parta despues del vencimiento. Si un
     * tramo cruza el refrigerio de la unidad, el reloj incluye esa pausa
     * (LE-024), de modo que el instante de retorno sea el real.
     *
     * @param escenario escenario operativo con malla y tiempo de servicio
     * @param ruta      ruta a recorrer
     * @param salida    instante absoluto de salida del almacen de origen
     * @return arreglo con distancia, fin, incumplimientos y holgura minima
     */
    public static int[] recorrer(EscenarioOperativo escenario, Ruta ruta, int salida) {
        if (ruta.getSecuencia().isEmpty()) {
            return new int[]{0, salida, 0, Integer.MAX_VALUE};
        }
        int distanciaTotal = 0;
        int reloj = salida;
        int incumplimientos = 0;
        int holguraMinima = Integer.MAX_VALUE;
        int idVehiculo = ruta.getVehiculo().getId();
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (Entrega entrega : ruta.getSecuencia()) {
            int tramo = distancia(escenario, actual, entrega.getDestino(), reloj);
            distanciaTotal += tramo;
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            int holgura = entrega.getHoraLimite() - reloj;
            if (holgura < 0) {
                incumplimientos++;
            }
            if (holgura < holguraMinima) {
                holguraMinima = holgura;
            }
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
        if (ruta.getDestino() != null) {
            int tramoFinal = distancia(escenario, actual, ruta.getDestino().getUbicacion(), reloj);
            distanciaTotal += tramoFinal;
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    minutosDeViaje(tramoFinal, ruta.getVehiculo().getTipo()));
        }
        int holgura = holguraMinima == Integer.MAX_VALUE ? 0 : holguraMinima;
        return new int[]{distanciaTotal, reloj, incumplimientos, holgura};
    }

    /**
     * Resultado de cortar una ruta en un instante dado.
     *
     * @param ubicacion  nodo en que se encuentra la unidad en ese instante
     * @param pendientes entregas de la secuencia original aun no completadas
     */
    public record CorteRuta(Nodo ubicacion, List<Entrega> pendientes) {
    }

    /**
     * Corta una ruta en un instante dado -por ejemplo, una averia a mitad de
     * camino- separando lo que la unidad ya entrego de lo que aun llevaba a
     * bordo. Recorre la secuencia con la misma logica que {@link #recorrer}
     * (incluida la pausa de refrigerio), pero se detiene en la primera entrega
     * que no llega a completarse -llegada mas servicio- antes del corte: esa y
     * las siguientes quedan pendientes, y la ubicacion de la unidad es el
     * destino de la ultima entrega que si completo (o el origen, si ninguna).
     *
     * @param escenario     escenario operativo con malla y tiempo de servicio
     * @param ruta          ruta a cortar
     * @param salida        instante absoluto de salida del almacen de origen
     * @param instanteCorte instante en el que se corta la ruta
     * @return ubicacion de la unidad y entregas pendientes en ese instante
     */
    public static CorteRuta cortarEnInstante(EscenarioOperativo escenario, Ruta ruta,
                                             int salida, int instanteCorte) {
        List<Entrega> secuencia = ruta.getSecuencia();
        if (secuencia.isEmpty() || salida >= instanteCorte) {
            return new CorteRuta(ruta.getOrigen().getUbicacion(), new ArrayList<>(secuencia));
        }
        int reloj = salida;
        int idVehiculo = ruta.getVehiculo().getId();
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (int i = 0; i < secuencia.size(); i++) {
            Entrega entrega = secuencia.get(i);
            int tramo = distancia(escenario, actual, entrega.getDestino(), reloj);
            int llegada = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            int fin = CalendarioTurnos.avanzarConPausa(idVehiculo, llegada, escenario.getTiempoServicio());
            if (fin > instanteCorte) {
                return new CorteRuta(actual, new ArrayList<>(secuencia.subList(i, secuencia.size())));
            }
            reloj = fin;
            actual = entrega.getDestino();
        }
        return new CorteRuta(actual, List.of());
    }

    private CalculadoraTiempos() {
    }
}
