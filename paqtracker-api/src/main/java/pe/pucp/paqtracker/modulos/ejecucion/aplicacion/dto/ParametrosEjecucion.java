package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

/**
 * Parametros con los que corre una ejecucion.
 *
 * @param saltoConsumoScSegundos  segundos reales entre dos difusiones del estado
 * @param saltoAlgoritmoSaMinutos minutos simulados entre dos planificaciones
 * @param factorAceleracionK      minutos simulados por minuto real
 * @param fraccionSemaforoRojo    holgura, como fraccion del plazo, bajo la que un pedido esta en rojo
 * @param fraccionSemaforoAmbar   holgura, como fraccion del plazo, bajo la que un pedido esta en ambar
 */
public record ParametrosEjecucion(int saltoConsumoScSegundos, int saltoAlgoritmoSaMinutos,
                                  double factorAceleracionK, double fraccionSemaforoRojo,
                                  double fraccionSemaforoAmbar) {
}
