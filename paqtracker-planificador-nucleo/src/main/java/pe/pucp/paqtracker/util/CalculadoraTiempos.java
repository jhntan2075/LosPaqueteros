package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.ArrayList;
import java.util.List;

/**
 * Calculo unificado de distancias y tiempos de una ruta. Considera la velocidad
 * del tipo de unidad, los bloqueos vigentes en el minuto en que la unidad pasa
 * por cada nodo y el tiempo de acondicionamiento por entrega. Todas las capas del
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
     * Distancia de un tramo entre dos nodos con los bloqueos vigentes en un unico instante. Solo para
     * estimaciones que no conocen la unidad (heuristicas); las rutas se evaluan con
     * {@link #distancia(EscenarioOperativo, Nodo, Nodo, int, Vehiculo)}.
     *
     * @param escenario escenario operativo con la malla vigente
     * @param origen    nodo de partida
     * @param destino   nodo de llegada
     * @param instante  minuto absoluto en que se evaluan los bloqueos
     * @return distancia del tramo
     */
    public static int distancia(EscenarioOperativo escenario, Nodo origen, Nodo destino, int instante) {
        if (escenario.getMalla() == null) {
            return origen.distanciaManhattan(destino);
        }
        return escenario.getMalla().distancia(origen, destino, instante);
    }

    /**
     * Distancia que recorre una unidad en un tramo, esquivando los bloqueos que estarian vigentes
     * cuando pase por cada nodo, si el escenario tiene malla.
     *
     * @param escenario escenario operativo con la malla vigente
     * @param origen    nodo de partida
     * @param destino   nodo de llegada
     * @param salida    minuto absoluto en que la unidad sale del origen
     * @param vehiculo  unidad que recorre el tramo
     * @return distancia del tramo
     */
    public static int distancia(EscenarioOperativo escenario, Nodo origen, Nodo destino, int salida,
                                Vehiculo vehiculo) {
        if (escenario.getMalla() == null) {
            return origen.distanciaManhattan(destino);
        }
        return escenario.getMalla().distancia(origen, destino, salida, vehiculo);
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
            int tramo = distancia(escenario, actual, entrega.getDestino(), reloj, ruta.getVehiculo());
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
            int tramoFinal = distancia(escenario, actual, ruta.getDestino().getUbicacion(), reloj,
                    ruta.getVehiculo());
            distanciaTotal += tramoFinal;
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    minutosDeViaje(tramoFinal, ruta.getVehiculo().getTipo()));
        }
        int holgura = holguraMinima == Integer.MAX_VALUE ? 0 : holguraMinima;
        return new int[]{distanciaTotal, reloj, incumplimientos, holgura};
    }

    /**
     * Recorre una ruta igual que {@link #recorrer} y devuelve cada tramo con sus
     * instantes: viaje a cada entrega, acondicionamiento en su destino y retorno
     * al almacen. La llegada del ultimo tramo coincide con el instante de fin de
     * {@code recorrer}. Se calcula una sola vez por despacho, fuera de los bucles
     * de busqueda, para que el visualizador interpole la posicion de la unidad.
     *
     * @param escenario escenario operativo con malla y tiempo de servicio
     * @param ruta      ruta a recorrer
     * @param salida    instante absoluto de salida del almacen de origen
     * @return tramos en orden de recorrido; vacio si la ruta no tiene entregas
     */
    public static List<Tramo> trazar(EscenarioOperativo escenario, Ruta ruta, int salida) {
        List<Tramo> tramos = new ArrayList<>();
        if (ruta.getSecuencia().isEmpty()) {
            return tramos;
        }
        int reloj = salida;
        Vehiculo vehiculo = ruta.getVehiculo();
        int idVehiculo = vehiculo.getId();
        TipoVehiculo tipo = vehiculo.getTipo();
        Nodo actual = ruta.getOrigen().getUbicacion();
        for (Entrega entrega : ruta.getSecuencia()) {
            int distancia = distancia(escenario, actual, entrega.getDestino(), reloj, vehiculo);
            int llegada = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, minutosDeViaje(distancia, tipo));
            tramos.add(new Tramo(TipoTramo.VIAJE_A_ENTREGA, actual, entrega.getDestino(), reloj, llegada,
                    distancia, entrega.getIdPedido(), entrega.getCantidad(),
                    camino(escenario, actual, entrega.getDestino(), reloj, vehiculo)));
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, llegada, escenario.getTiempoServicio());
            tramos.add(new Tramo(TipoTramo.SERVICIO, entrega.getDestino(), entrega.getDestino(), llegada,
                    reloj, 0, entrega.getIdPedido(), 0));
            actual = entrega.getDestino();
        }
        if (ruta.getDestino() != null) {
            Nodo almacen = ruta.getDestino().getUbicacion();
            int distancia = distancia(escenario, actual, almacen, reloj, vehiculo);
            int llegada = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, minutosDeViaje(distancia, tipo));
            tramos.add(new Tramo(TipoTramo.RETORNO, actual, almacen, reloj, llegada, distancia,
                    Tramo.SIN_PEDIDO, 0, camino(escenario, actual, almacen, reloj, vehiculo)));
        }
        return tramos;
    }

    /**
     * Camino real de un tramo, con el mismo criterio que la distancia: rodea los bloqueos que la
     * unidad encontraria al pasar si el escenario tiene malla; si no, el camino en L.
     */
    private static List<Nodo> camino(EscenarioOperativo escenario, Nodo origen, Nodo destino, int salida,
                                     Vehiculo vehiculo) {
        if (escenario.getMalla() == null) {
            return Malla.caminoEnL(origen, destino);
        }
        return escenario.getMalla().camino(origen, destino, salida, vehiculo);
    }

    private CalculadoraTiempos() {
    }
}
