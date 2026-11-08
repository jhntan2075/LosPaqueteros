package pe.pucp.paqtracker.modulos.acceso.aplicacion.dto;

/**
 * Estado de la sesion de quien consulta. Con la seguridad apagada el front entra sin login.
 *
 * @param seguridadActiva si la API exige sesion
 * @param autenticado     si el token enviado corresponde a una sesion vigente
 * @param usuario         cuenta de la sesion, o null
 * @param expiraEnMs      vencimiento de la sesion en milisegundos desde la epoca, o null
 */
public record EstadoSesion(boolean seguridadActiva, boolean autenticado, String usuario, Long expiraEnMs) {
}
