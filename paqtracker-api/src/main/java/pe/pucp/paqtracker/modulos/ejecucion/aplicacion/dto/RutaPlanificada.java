package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import java.util.List;

/**
 * Ruta de una unidad dentro de un plan.
 *
 * @param unidad        codigo de la unidad
 * @param tipo          AUTO, MOTO o BICICLETA
 * @param almacenOrigen almacen del que sale
 * @param salidaMs      salida del almacen, epoch en milisegundos simulados
 * @param regresoMs     fin de la ruta (vuelta al almacen), epoch en milisegundos simulados
 * @param distanciaKm   kilometros de toda la ruta
 * @param carga         paquetes de las entregas pendientes
 * @param capacidad     capacidad de la unidad
 * @param paradas       entregas pendientes, en orden
 */
public record RutaPlanificada(String unidad, String tipo, String almacenOrigen, long salidaMs, long regresoMs,
                              int distanciaKm, int carga, int capacidad, List<ParadaPlanificada> paradas) {

    /**
     * @param pedido       codigo del pedido
     * @param destino      punto de entrega
     * @param cantidad     paquetes que se entregan
     * @param llegadaMs    llegada estimada
     * @param horaLimiteMs hora limite del pedido
     */
    public record ParadaPlanificada(String pedido, Coordenada destino, int cantidad, long llegadaMs,
                                    long horaLimiteMs) {
    }
}
