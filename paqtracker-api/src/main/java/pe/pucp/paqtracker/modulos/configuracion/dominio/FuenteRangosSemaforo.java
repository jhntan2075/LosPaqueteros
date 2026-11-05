package pe.pucp.paqtracker.modulos.configuracion.dominio;

/**
 * Entrega los rangos del semaforo vigentes en el momento de la consulta. Quien calcula un nivel la consulta
 * cada vez, en vez de guardar los rangos, para que un cambio del operador rija desde la siguiente difusion.
 */
@FunctionalInterface
public interface FuenteRangosSemaforo {

    /**
     * @return rangos vigentes
     */
    RangosSemaforo vigentes();
}
