package pe.pucp.paqtracker.modulos.difusion.aplicacion.dto;

import java.util.List;

/**
 * Bloqueo vigente, para dibujarlo en el mapa (LE-083).
 *
 * @param id       identificador del bloqueo en la ejecucion
 * @param puntos   vertices de la polilinea bloqueada
 * @param inicioMs inicio de la vigencia, epoch en milisegundos simulados
 * @param finMs    fin de la vigencia, epoch en milisegundos simulados
 */
public record BloqueoEnMapa(int id, List<Coordenada> puntos, long inicioMs, long finMs) {
}
