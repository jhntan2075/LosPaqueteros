package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import org.springframework.stereotype.Repository;
import pe.pucp.paqtracker.modulos.incidencias.dominio.AveriaRegistrada;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioAveria;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

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

    private static AveriaRegistrada aDominio(EntidadAveria entidad) {
        return new AveriaRegistrada(entidad.getId(), entidad.getEjecucionId(), entidad.getCodigoUnidad(),
                entidad.getTipo(), entidad.getInstante().toInstant(ZoneOffset.UTC),
                entidad.getRegistradaEn().toInstant(ZoneOffset.UTC));
    }
}
