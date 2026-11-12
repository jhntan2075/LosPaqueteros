package pe.pucp.paqtracker.modulos.ejecucion.dominio;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Puerto de persistencia de las ejecuciones.
 */
public interface RepositorioEjecucion {

    /**
     * Crea o actualiza la fila. Si ya existe, conserva su instante de creacion: en el dia a dia es el primer
     * arranque del mes, que marca desde cuando se operan sus pedidos.
     *
     * @param registro datos de la ejecucion
     */
    void guardar(RegistroEjecucion registro);

    /**
     * @param id identificador de la fila
     * @return la ejecucion guardada, si existe
     */
    Optional<RegistroEjecucion> buscar(String id);

    /**
     * @return todas las ejecuciones guardadas, de la mas antigua a la mas nueva
     */
    List<RegistroEjecucion> listar();

    /**
     * @param finalizadaEn instante real del cierre
     * @return ejecuciones que quedaron sin terminar y se cerraron
     */
    int cerrarInterrumpidas(Instant finalizadaEn);
}
