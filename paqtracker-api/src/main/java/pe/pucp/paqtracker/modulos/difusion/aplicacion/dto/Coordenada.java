package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

/**
 * Punto de la malla, en kilometros. Admite fraccion para la posicion interpolada de una unidad.
 *
 * @param x coordenada horizontal
 * @param y coordenada vertical
 */
public record Coordenada(double x, double y) {
}
