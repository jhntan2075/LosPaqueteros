package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.modelo.TipoAveria;

/**
 * Averia que se registra en una ejecucion en curso, ya validada en su forma.
 *
 * @param codigoUnidad codigo visible de la unidad (A-01, M-03, B-12)
 * @param tipo         severidad de la averia
 */
public record SolicitudAveriaEnVivo(String codigoUnidad, TipoAveria tipo) {
}
