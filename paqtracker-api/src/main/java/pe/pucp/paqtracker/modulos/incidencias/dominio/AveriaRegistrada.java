package pe.pucp.paqtracker.modulos.incidencias.dominio;

import java.time.Instant;

/**
 * Averia registrada manualmente por el operador (CU-13), tal como queda en la bitacora.
 *
 * @param id           identificador en la base de datos, o null si aun no se guarda
 * @param ejecucionId  ejecucion en la que se registro
 * @param codigoUnidad codigo visible de la unidad
 * @param tipo         severidad: 1, 2 o 3
 * @param instante     instante simulado de la averia
 * @param registradaEn instante real del registro
 * @param canceladaEn  instante real en que se deshizo antes de aplicarse, o null si sigue vigente
 */
public record AveriaRegistrada(Long id, String ejecucionId, String codigoUnidad, int tipo, Instant instante,
                               Instant registradaEn, Instant canceladaEn) {
}
