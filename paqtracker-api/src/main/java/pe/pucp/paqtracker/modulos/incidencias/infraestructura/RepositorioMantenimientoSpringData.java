package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

/**
 * Acceso Spring Data a la tabla {@code mantenimiento}.
 */
public interface RepositorioMantenimientoSpringData extends JpaRepository<EntidadMantenimiento, Long> {

    /**
     * @return todo el plan por fecha y unidad
     */
    List<EntidadMantenimiento> findAllByOrderByFechaAscCodigoUnidadAsc();

    /**
     * @param desde primer dia, inclusive
     * @param hasta ultimo dia, inclusive
     * @return intervenciones de esos dias por fecha y unidad
     */
    List<EntidadMantenimiento> findByFechaBetweenOrderByFechaAscCodigoUnidadAsc(LocalDate desde, LocalDate hasta);
}
