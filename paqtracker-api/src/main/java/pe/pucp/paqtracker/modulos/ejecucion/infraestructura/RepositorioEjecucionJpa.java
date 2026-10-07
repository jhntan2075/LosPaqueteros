package pe.pucp.paqtracker.modulos.ejecucion.infraestructura;

import org.springframework.stereotype.Repository;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
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
    public void guardar(RegistroEjecucion registro) {
        springData.save(new EntidadEjecucion(registro.id(), registro.tipoEscenario().name(),
                registro.estado().name(), registro.algoritmo(), registro.fechaInicio(), registro.dias(),
                registro.factorAceleracion(), aUtc(registro.creadaEn()), aUtc(registro.finalizadaEn()),
                registro.entregas(), registro.incumplimientos(), aUtc(registro.fechaColapso()), registro.autos(),
                registro.motos(), registro.bicicletas()));
    }

    @Override
    public Optional<RegistroEjecucion> buscar(String id) {
        return springData.findById(id).map(entidad -> new RegistroEjecucion(entidad.getId(),
                TipoEscenario.valueOf(entidad.getTipoEscenario()), EstadoEjecucion.valueOf(entidad.getEstado()),
                entidad.getAlgoritmo(), entidad.getFechaInicio(), entidad.getDias(), entidad.getFactorAceleracion(),
                aInstante(entidad.getCreadaEn()), aInstante(entidad.getFinalizadaEn()), entidad.getEntregas(),
                entidad.getIncumplimientos(), aInstante(entidad.getFechaColapso()), entidad.getAutos(),
                entidad.getMotos(), entidad.getBicicletas()));
    }

    @Override
    public int cerrarInterrumpidas(Instant finalizadaEn) {
        return springData.cerrarNoTerminadas(EstadoEjecucion.FINALIZADA.name(), aUtc(finalizadaEn),
                List.of(EstadoEjecucion.FINALIZADA.name(), EstadoEjecucion.COLAPSADA.name()));
    }

    private static LocalDateTime aUtc(Instant instante) {
        return instante == null ? null : LocalDateTime.ofInstant(instante, ZoneOffset.UTC);
    }

    private static Instant aInstante(LocalDateTime fecha) {
        return fecha == null ? null : fecha.toInstant(ZoneOffset.UTC);
    }
}
