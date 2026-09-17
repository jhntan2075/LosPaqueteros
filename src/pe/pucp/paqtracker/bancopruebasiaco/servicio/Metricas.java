package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.TipoVehiculo;

import java.util.List;
import java.util.Map;

/**
 * Resultado de una corrida completa del simulador.
 *
 * @param colapso primer momento en que el sistema dejó de poder cumplir, o {@code null}
 */
public record Metricas(String planificador,
                       String escenario,
                       int diasSimulados,
                       int pedidos,
                       int enPlazo,
                       int tardios,
                       int sinEntregar,
                       double km,
                       double kmVacio,
                       double costo,
                       Map<TipoVehiculo, Double> kmPorTipo,
                       int rutasDespachadas,
                       double paradasPorRuta,
                       double utilizacionFlota,
                       int planes,
                       double msPlanMedio,
                       double msPlanMax,
                       double holguraMinHoras,
                       double holguraMediaHoras,
                       String colapso,
                       List<Integer> idsTardios,
                       List<Integer> idsSinEntregar,
                       long msCorrida) {

    /** Lista abreviada: con cientos de ids, volcarlos todos no informa de nada. */
    private static String muestra(List<Integer> ids) {
        int tope = 30;
        if (ids.size() <= tope) {
            return ids.toString();
        }
        return ids.subList(0, tope) + " ... y " + (ids.size() - tope) + " más";
    }

    public double porcentajeEnPlazo() {
        return pedidos == 0 ? 100.0 : 100.0 * enPlazo / pedidos;
    }

    public String resumen() {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("%-14s %-8s %2d d  pedidos=%d  en plazo=%.2f%%  tardíos=%d  sin entregar=%d%n",
                planificador, escenario, diasSimulados, pedidos, porcentajeEnPlazo(),
                tardios, sinEntregar));
        sb.append(String.format("           km=%.0f (vacío %.0f)  costo=%.0f  t/plan medio=%.0f ms  máx=%.0f ms  corrida=%.1f s%n",
                km, kmVacio, costo, msPlanMedio, msPlanMax, msCorrida / 1000.0));
        sb.append(String.format("           rutas=%d  paradas/ruta=%.2f  uso de flota=%.1f%%%n",
                rutasDespachadas, paradasPorRuta, 100 * utilizacionFlota));
        sb.append("           km por tipo: ");
        for (Map.Entry<TipoVehiculo, Double> e : kmPorTipo.entrySet()) {
            sb.append(e.getKey()).append('=').append(Math.round(e.getValue())).append("  ");
        }
        sb.append(String.format("%n           holgura mín=%.2f h  media=%.2f h  colapso=%s",
                holguraMinHoras, holguraMediaHoras, colapso == null ? "ninguno" : colapso));
        if (!idsTardios.isEmpty()) {
            sb.append("\n           ids tardíos: ").append(muestra(idsTardios));
        }
        if (!idsSinEntregar.isEmpty()) {
            sb.append("\n           ids sin entregar: ").append(muestra(idsSinEntregar));
        }
        return sb.toString();
    }
}
