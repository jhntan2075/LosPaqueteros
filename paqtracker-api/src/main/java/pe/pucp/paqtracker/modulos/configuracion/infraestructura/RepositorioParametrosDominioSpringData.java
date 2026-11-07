package pe.pucp.paqtracker.modulos.configuracion.infraestructura;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acceso Spring Data a la tabla {@code parametros_dominio}.
 */
public interface RepositorioParametrosDominioSpringData extends JpaRepository<EntidadParametrosDominio, Integer> {
}
