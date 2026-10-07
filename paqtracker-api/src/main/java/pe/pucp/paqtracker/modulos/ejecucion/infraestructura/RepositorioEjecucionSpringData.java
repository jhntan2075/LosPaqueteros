package pe.pucp.paqtracker.modulos.ejecucion.infraestructura;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Acceso Spring Data a la tabla {@code ejecucion}.
 */
public interface RepositorioEjecucionSpringData extends JpaRepository<EntidadEjecucion, String> {

    /**
     * @param estadoFinal  estado con el que se cierran
     * @param finalizadaEn instante del cierre, UTC
     * @param terminales   estados que ya estan cerrados y no se tocan
     * @return filas actualizadas
     */
    @Transactional
    @Modifying
    @Query("update EntidadEjecucion e set e.estado = :estadoFinal, e.finalizadaEn = :finalizadaEn "
            + "where e.estado not in :terminales")
    int cerrarNoTerminadas(@Param("estadoFinal") String estadoFinal,
                           @Param("finalizadaEn") LocalDateTime finalizadaEn,
                           @Param("terminales") List<String> terminales);
}
