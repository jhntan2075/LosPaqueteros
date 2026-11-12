package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Acceso Spring Data a la tabla {@code pedido}.
 */
public interface RepositorioPedidoSpringData extends JpaRepository<EntidadPedido, Long> {

    /**
     * @param lote  lote
     * @param desde inicio, incluido, UTC
     * @param hasta fin, excluido, UTC
     * @return pedidos del lote en el intervalo, en orden de registro
     */
    @Query("select p from EntidadPedido p where p.lote = :lote and p.registradoEn >= :desde "
            + "and p.registradoEn < :hasta order by p.registradoEn, p.id")
    List<EntidadPedido> buscarDelLote(@Param("lote") String lote, @Param("desde") LocalDateTime desde,
                                      @Param("hasta") LocalDateTime hasta);

    /**
     * @param origen origen
     * @param desde  inicio, incluido, UTC
     * @param hasta  fin, excluido, UTC
     * @return pedidos del origen en el intervalo, en orden de registro
     */
    @Query("select p from EntidadPedido p where p.origen = :origen and p.registradoEn >= :desde "
            + "and p.registradoEn < :hasta order by p.registradoEn, p.id")
    List<EntidadPedido> buscarPorOrigen(@Param("origen") String origen, @Param("desde") LocalDateTime desde,
                                        @Param("hasta") LocalDateTime hasta);

    /**
     * @param lote lote
     * @return meses (YYYYMM) distintos del lote
     */
    @Query("select distinct p.mesArchivo from EntidadPedido p where p.lote = :lote")
    List<String> buscarMesesDelLote(@Param("lote") String lote);

    /**
     * @param lote        lote de una corrida sin ejecucion
     * @param ejecucionId ejecucion que lo usa
     * @return filas actualizadas
     */
    @Transactional
    @Modifying
    @Query("update EntidadPedido p set p.ejecucionId = :ejecucionId where p.lote = :lote "
            + "and p.ejecucionId is null and p.origen = 'ARCHIVO_CORRIDA'")
    int vincularLote(@Param("lote") String lote, @Param("ejecucionId") String ejecucionId);

    /**
     * @return filas borradas de lotes de corrida sin ejecucion
     */
    @Transactional
    @Modifying
    @Query("delete from EntidadPedido p where p.origen = 'ARCHIVO_CORRIDA' and p.ejecucionId is null")
    int borrarLotesSinEjecucion();

    /**
     * @param id           pedido
     * @param registradoEn registro, UTC
     * @param horaLimite   hora limite, UTC
     * @return filas actualizadas
     */
    @Transactional
    @Modifying
    @Query("update EntidadPedido p set p.registradoEn = :registradoEn, p.horaLimite = :horaLimite "
            + "where p.id = :id")
    int actualizarRegistro(@Param("id") long id, @Param("registradoEn") LocalDateTime registradoEn,
                           @Param("horaLimite") LocalDateTime horaLimite);
}
