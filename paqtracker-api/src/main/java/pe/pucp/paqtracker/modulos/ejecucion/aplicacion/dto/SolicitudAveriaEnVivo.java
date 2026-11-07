package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.modelo.TipoAveria;

/**
 * Averia que se registra en una ejecucion en curso, ya validada en su forma.
 *
 * @param codigoUnidad codigo visible de la unidad (A-01, M-03, B-12)
 * @param tipo         severidad de la averia
 * @param instanteMs   instante simulado (epoch ms) en que ocurre; null para el instante actual del reloj
 */
public record SolicitudAveriaEnVivo(String codigoUnidad, TipoAveria tipo, Long instanteMs) {

    /**
     * Averia en el instante actual del reloj.
     *
     * @param codigoUnidad codigo visible de la unidad
     * @param tipo         severidad de la averia
     */
    public SolicitudAveriaEnVivo(String codigoUnidad, TipoAveria tipo) {
        this(codigoUnidad, tipo, null);
    }
}
