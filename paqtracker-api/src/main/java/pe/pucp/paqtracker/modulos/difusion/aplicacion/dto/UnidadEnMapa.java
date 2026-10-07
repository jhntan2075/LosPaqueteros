package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import java.util.List;

/**
 * Estado de una unidad de la flota en un instante.
 *
 * @param id              identificador de la unidad
 * @param codigo          codigo visible (A-01, M-03, B-12)
 * @param tipo            AUTO, MOTO o BICICLETA
 * @param capacidadMaxima paquetes que puede transportar
 * @param cargaActual     paquetes que lleva y aun no entrega
 * @param velocidadKmH    velocidad de su tipo
 * @param estado          estado operativo (DISPONIBLE_EN_ALMACEN, EN_RUTA, EN_REFRIGERIO...)
 * @param ubicacionActual posicion, interpolada si esta en un tramo
 * @param tramoEnCurso    tramo que recorre, o null si esta detenida en un almacen
 * @param paradas         entregas pendientes, en orden
 */
public record UnidadEnMapa(int id, String codigo, String tipo, int capacidadMaxima, int cargaActual,
                           int velocidadKmH, String estado, Coordenada ubicacionActual, TramoEnCurso tramoEnCurso,
                           List<ParadaPendiente> paradas) {
}
