package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

/**
 * Estado de un almacen en un instante.
 *
 * @param id              identificador del almacen
 * @param codigo          CENTRAL, INTERMEDIO_1 o INTERMEDIO_2
 * @param nombre          nombre visible
 * @param ubicacion       posicion en la malla
 * @param capacidadMaxima capacidad del almacen; null si es ilimitado
 * @param stockActual     stock disponible; null si es ilimitado
 * @param esPrincipal     verdadero para el almacen central
 * @param nivelInventario semaforo del stock (VERDE, AMBAR, ROJO); null si es ilimitado (LE-078)
 */
public record AlmacenEnMapa(int id, String codigo, String nombre, Coordenada ubicacion, Integer capacidadMaxima,
                            Integer stockActual, boolean esPrincipal, String nivelInventario) {
}
