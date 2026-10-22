package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import org.springframework.stereotype.Repository;
import pe.pucp.paqtracker.modulos.incidencias.dominio.AveriaRegistrada;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioAveria;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

/**
 * Adaptador JPA del puerto {@link RepositorioAveria}. Las entidades no salen de esta capa.
 */
@Repository
public class RepositorioAveriaJpa implements RepositorioAveria {

    private final RepositorioAveriaSpringData springData;

    /**
     * @param springData repositorio Spring Data
     */
    public RepositorioAveriaJpa(RepositorioAveriaSpringData springData) {
        this.springData = springData;
    }

    @Override
    public AveriaRegistrada guardar(AveriaRegistrada averia) {
        EntidadAveria guardada = springData.save(new EntidadAveria(averia.ejecucionId(), averia.codigoUnidad(),
                averia.tipo(), LocalDateTime.ofInstant(averia.instante(), ZoneOffset.UTC),
                LocalDateTime.ofInstant(averia.registradaEn(), ZoneOffset.UTC)));
        return aDominio(guardada);
    }

    @Override
    public List<AveriaRegistrada> listarPorEjecucion(String ejecucionId) {
        return springData.findByEjecucionIdOrderById(ejecucionId).stream()
                .map(RepositorioAveriaJpa::aDominio).toList();
    }

    @Override
    public Optional<AveriaRegistrada> buscar(long id) {
        return springData.findById(id).map(RepositorioAveriaJpa::aDominio);
    }

    @Override
    public AveriaRegistrada marcarCancelada(long id, Instant canceladaEn) {
        EntidadAveria entidad = springData.findById(id)
                .orElseThrow(() -> new IllegalStateException("La averia " + id + " no existe"));
        entidad.marcarCancelada(LocalDateTime.ofInstant(canceladaEn, ZoneOffset.UTC));
        return aDominio(springData.save(entidad));
    }

    private static AveriaRegistrada aDominio(EntidadAveria entidad) {
        return new AveriaRegistrada(entidad.getId(), entidad.getEjecucionId(), entidad.getCodigoUnidad(),
                entidad.getTipo(), entidad.getInstante().toInstant(ZoneOffset.UTC),
                entidad.getRegistradaEn().toInstant(ZoneOffset.UTC),
                entidad.getCanceladaEn() == null ? null : entidad.getCanceladaEn().toInstant(ZoneOffset.UTC));
    }
}
