package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Instant;
import java.util.Optional;

/**
 * Puerto de salida para persistir las ejecuciones.
 */
public interface RepositorioEjecucion {

    /**
     * Inserta o actualiza el registro de una ejecucion.
     *
     * @param registro datos a guardar
     */
    void guardar(RegistroEjecucion registro);

    /**
     * @param id identificador de la ejecucion
     * @return registro guardado, o vacio si no existe
     */
    Optional<RegistroEjecucion> buscar(String id);

    /**
     * Cierra como finalizadas las ejecuciones que quedaron sin terminar: su estado vivo estaba en memoria
     * y se perdio al detenerse la instancia anterior de la API.
     *
     * @param finalizadaEn instante real del cierre
     * @return cantidad de ejecuciones cerradas
     */
    int cerrarInterrumpidas(Instant finalizadaEn);
}
