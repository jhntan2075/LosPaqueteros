package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.Pedido;
import java.util.ArrayList;
import java.util.List;

/**
 * Convierte pedidos en entregas ruteables. Un pedido se divide unicamente
 * cuando su cantidad excede la capacidad de la unidad mas grande de la flota;
 * en ese caso se parte en el minimo numero de entregas posible. Los fragmentos
 * conservan destino, plazo e instante de registro del pedido original.
 *
 * La fragmentacion ocurre antes del algoritmo, que opera sobre entregas ya
 * ruteables sin conocer esta logica.
 */
public final class Fragmentador {

    /**
     * Fragmenta una lista de pedidos en entregas ruteables.
     *
     * @param pedidos          pedidos a fragmentar
     * @param capacidadMaxima  capacidad de la unidad mas grande de la flota
     * @return lista de entregas resultantes
     */
    public static List<Entrega> fragmentar(List<Pedido> pedidos, int capacidadMaxima) {
        List<Entrega> salida = new ArrayList<>();
        int idEntrega = 0;
        for (Pedido pedido : pedidos) {
            if (pedido.getCantidad() <= capacidadMaxima) {
                salida.add(crearEntrega(idEntrega++, pedido, pedido.getCantidad()));
            } else {
                int restante = pedido.getCantidad();
                while (restante > 0) {
                    int cantidad = Math.min(capacidadMaxima, restante);
                    salida.add(crearEntrega(idEntrega++, pedido, cantidad));
                    restante -= cantidad;
                }
            }
        }
        return salida;
    }

    /**
     * Crea una entrega a partir de un pedido y una cantidad.
     *
     * @param id       identificador de la entrega
     * @param pedido   pedido de origen
     * @param cantidad cantidad de la entrega
     * @return entrega construida
     */
    private static Entrega crearEntrega(int id, Pedido pedido, int cantidad) {
        return new Entrega(id, pedido.getId(), pedido.getDestino(), cantidad,
                pedido.getInstanteRegistro(), pedido.getPlazo());
    }

    private Fragmentador() {
    }
}
