package pe.pucp.paqtracker.modelo;

import java.util.ArrayList;
import java.util.List;

/**
 * Ruta de una unidad de transporte: parte de un almacen de origen, visita una
 * secuencia ordenada de entregas y termina en un almacen de destino. El destino
 * forma parte de la decision del planificador, sujeto a que ese almacen tenga
 * stock proyectado al momento de la llegada.
 */
public final class Ruta {

    private final Vehiculo vehiculo;
    private final Almacen origen;
    private Almacen destino;
    private final List<Entrega> secuencia;

    /**
     * @param vehiculo unidad que ejecuta la ruta
     * @param origen   almacen de partida
     */
    public Ruta(Vehiculo vehiculo, Almacen origen) {
        this.vehiculo = vehiculo;
        this.origen = origen;
        this.secuencia = new ArrayList<>();
    }

    /**
     * Crea una copia independiente de esta ruta.
     *
     * @return copia con la misma unidad, origen, destino y secuencia
     */
    public Ruta copiar() {
        Ruta copia = new Ruta(vehiculo, origen);
        copia.destino = destino;
        copia.secuencia.addAll(secuencia);
        return copia;
    }

    public Vehiculo getVehiculo() {
        return vehiculo;
    }

    public Almacen getOrigen() {
        return origen;
    }

    public Almacen getDestino() {
        return destino;
    }

    public void setDestino(Almacen destino) {
        this.destino = destino;
    }

    public List<Entrega> getSecuencia() {
        return secuencia;
    }

    /**
     * Carga total transportada por la ruta.
     *
     * @return suma de las cantidades de las entregas
     */
    public int getCarga() {
        int carga = 0;
        for (Entrega entrega : secuencia) {
            carga += entrega.getCantidad();
        }
        return carga;
    }

    @Override
    public String toString() {
        StringBuilder texto = new StringBuilder();
        texto.append(vehiculo).append(" ").append(origen).append("->").append(destino)
                .append(" [").append(getCarga()).append("/").append(vehiculo.getCapacidad()).append("] ");
        for (Entrega entrega : secuencia) {
            texto.append(entrega).append(" ");
        }
        return texto.toString().trim();
    }
}
