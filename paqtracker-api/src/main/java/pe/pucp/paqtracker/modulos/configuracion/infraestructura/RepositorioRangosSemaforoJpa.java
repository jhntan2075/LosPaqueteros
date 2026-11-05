package pe.pucp.paqtracker.modulos.configuracion.infraestructura;

import org.springframework.stereotype.Repository;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RepositorioRangosSemaforo;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

/**
 * Adaptador JPA del repositorio de rangos del semaforo.
 */
@Repository
public class RepositorioRangosSemaforoJpa implements RepositorioRangosSemaforo {

    private final RepositorioRangosSemaforoSpringData springData;

    /**
     * @param springData acceso Spring Data a la tabla
     */
    public RepositorioRangosSemaforoJpa(RepositorioRangosSemaforoSpringData springData) {
        this.springData = springData;
    }

    @Override
    public Optional<RangosSemaforo> buscar() {
        return springData.findById(EntidadRangosSemaforo.ID_UNICO).map(EntidadRangosSemaforo::aDominio);
    }

    @Override
    public RangosSemaforo guardar(RangosSemaforo rangos, Instant actualizadoEn) {
        LocalDateTime enUtc = actualizadoEn == null ? null : LocalDateTime.ofInstant(actualizadoEn, ZoneOffset.UTC);
        return springData.save(new EntidadRangosSemaforo(rangos, enUtc)).aDominio();
    }
}
