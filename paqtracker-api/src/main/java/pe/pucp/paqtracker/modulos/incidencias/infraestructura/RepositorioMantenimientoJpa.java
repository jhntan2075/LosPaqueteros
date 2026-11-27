package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modulos.incidencias.dominio.MantenimientoRegistrado;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioMantenimiento;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;

/**
 * Adaptador JPA del puerto {@link RepositorioMantenimiento}. Las entidades no salen de esta capa.
 */
@Repository
public class RepositorioMantenimientoJpa implements RepositorioMantenimiento {

    private final RepositorioMantenimientoSpringData springData;
    private final Clock relojPared;

    /**
     * @param springData repositorio Spring Data
     * @param relojPared reloj real, para la fecha de carga
     */
    public RepositorioMantenimientoJpa(RepositorioMantenimientoSpringData springData, Clock relojPared) {
        this.springData = springData;
        this.relojPared = relojPared;
    }

    @Override
    public List<MantenimientoRegistrado> listarTodos() {
        return springData.findAllByOrderByFechaAscCodigoUnidadAsc().stream()
                .map(RepositorioMantenimientoJpa::aDominio).toList();
    }

    @Override
    public List<MantenimientoRegistrado> listarEntre(LocalDate desde, LocalDate hasta) {
        return springData.findByFechaBetweenOrderByFechaAscCodigoUnidadAsc(desde, hasta).stream()
                .map(RepositorioMantenimientoJpa::aDominio).toList();
    }

    @Override
    @Transactional
    public void guardarTodos(Collection<MantenimientoRegistrado> nuevas) {
        LocalDateTime ahora = LocalDateTime.ofInstant(relojPared.instant(), ZoneOffset.UTC);
        springData.saveAll(nuevas.stream().map(m -> new EntidadMantenimiento(m.fecha(), m.codigoUnidad(),
                m.tipo().name(), m.correlativo(), ahora)).toList());
    }

    @Override
    @Transactional
    public void borrar(Collection<Long> ids) {
        springData.deleteAllByIdInBatch(ids);
    }

    private static MantenimientoRegistrado aDominio(EntidadMantenimiento entidad) {
        return new MantenimientoRegistrado(entidad.getId(), entidad.getFecha(), entidad.getCodigoUnidad(),
                TipoVehiculo.valueOf(entidad.getTipoUnidad()), entidad.getCorrelativo());
    }
}
