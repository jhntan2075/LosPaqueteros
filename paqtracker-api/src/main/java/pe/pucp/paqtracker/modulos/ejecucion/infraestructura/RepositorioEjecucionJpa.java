package pe.pucp.paqtracker.modulos.ejecucion.infraestructura;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Adaptador JPA del puerto {@link RepositorioEjecucion}. Las entidades no salen de esta capa.
 */
@Repository
public class RepositorioEjecucionJpa implements RepositorioEjecucion {

    private final RepositorioEjecucionSpringData springData;

    /**
     * @param springData repositorio Spring Data
     */
    public RepositorioEjecucionJpa(RepositorioEjecucionSpringData springData) {
        this.springData = springData;
    }

    @Override
    @Transactional
    public void guardar(RegistroEjecucion registro) {
        LocalDateTime creadaEn = springData.findById(registro.id()).map(EntidadEjecucion::getCreadaEn)
                .orElseGet(() -> ColumnasColapso.aUtc(registro.creadaEn()));
        springData.save(new EntidadEjecucion(registro, creadaEn));
    }

    @Override
    public Optional<RegistroEjecucion> buscar(String id) {
        return springData.findById(id).map(EntidadEjecucion::aDominio);
    }

    @Override
    public List<RegistroEjecucion> listar() {
        return springData.findAllByOrderByCreadaEnAsc().stream().map(EntidadEjecucion::aDominio).toList();
    }

    @Override
    public int cerrarInterrumpidas(Instant finalizadaEn) {
        return springData.cerrarNoTerminadas(EstadoEjecucion.FINALIZADA.name(), ColumnasColapso.aUtc(finalizadaEn),
                List.of(EstadoEjecucion.FINALIZADA.name(), EstadoEjecucion.COLAPSADA.name()));
    }
}
