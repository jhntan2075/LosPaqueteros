package pe.pucp.paqtracker.modulos.configuracion.infraestructura;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acceso Spring Data a la tabla {@code rangos_semaforo}.
 */
public interface RepositorioRangosSemaforoSpringData extends JpaRepository<EntidadRangosSemaforo, Integer> {
}
