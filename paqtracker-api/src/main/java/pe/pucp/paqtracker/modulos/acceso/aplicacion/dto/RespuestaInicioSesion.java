package pe.pucp.paqtracker.modulos.acceso.aplicacion.dto;

/**
 * Sesion recien abierta.
 *
 * @param token      valor para la cabecera {@code Authorization: Bearer} y para el CONNECT de STOMP
 * @param usuario    cuenta con la que se ingreso
 * @param expiraEnMs instante de vencimiento, en milisegundos desde la epoca
 */
public record RespuestaInicioSesion(String token, String usuario, long expiraEnMs) {
}
