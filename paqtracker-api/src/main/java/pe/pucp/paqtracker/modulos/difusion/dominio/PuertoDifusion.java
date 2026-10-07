package pe.pucp.paqtracker.modulos.difusion.dominio;

import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;

/**
 * Puerto de salida por el que se difunde el estado de las ejecuciones a los clientes conectados.
 */
public interface PuertoDifusion {

    /**
     * @param mensaje instantanea a difundir en el topico de estado de su ejecucion
     */
    void publicarEstado(MensajeEstadoEjecucion mensaje);

    /**
     * @param mensaje evento a difundir en el topico de eventos de su ejecucion
     */
    void publicarEvento(MensajeEventoEjecucion mensaje);
}
