package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

/**
 * Acceso Spring Data a la tabla {@code averia}.
 */
public interface RepositorioAveriaSpringData extends JpaRepository<EntidadAveria, Long> {

    /**
     * @param ejecucionId ejecucion
     * @return averias de la ejecucion en orden de registro
     */
    List<EntidadAveria> findByEjecucionIdOrderById(String ejecucionId);
}
