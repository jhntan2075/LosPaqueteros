package pe.pucp.paqtracker.modulos.ejecucion.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ColapsoRegistrado;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Columnas de la tabla {@code ejecucion} con el instante y la causa del colapso. Todas son nulas si no hubo.
 */
@Embeddable
public class ColumnasColapso {

    @Column(name = "fecha_colapso")
    private LocalDateTime fecha;

    @Column(name = "colapso_causa", length = 40)
    private String causa;

    @Column(name = "colapso_pedido", length = 20)
    private String pedido;

    @Column(name = "colapso_unidad", length = 20)
    private String unidad;

    @Column(name = "colapso_hora_limite")
    private LocalDateTime horaLimite;

    @Column(name = "colapso_llegada_estimada")
    private LocalDateTime llegadaEstimada;

    /** Constructor requerido por JPA. */
    protected ColumnasColapso() {
    }

    /**
     * @param colapso colapso a guardar, o null si no hubo
     */
    public ColumnasColapso(ColapsoRegistrado colapso) {
        if (colapso != null) {
            this.fecha = aUtc(colapso.fecha());
            this.causa = colapso.causa();
            this.pedido = colapso.pedido();
            this.unidad = colapso.unidad();
            this.horaLimite = aUtc(colapso.horaLimite());
            this.llegadaEstimada = aUtc(colapso.llegadaEstimada());
        }
    }

    /**
     * @return colapso guardado, o null si no hubo
     */
    public ColapsoRegistrado aDominio() {
        if (fecha == null) {
            return null;
        }
        return new ColapsoRegistrado(aInstante(fecha), causa, pedido, unidad, aInstante(horaLimite),
                aInstante(llegadaEstimada));
    }

    static LocalDateTime aUtc(Instant instante) {
        return instante == null ? null : LocalDateTime.ofInstant(instante, ZoneOffset.UTC);
    }

    static Instant aInstante(LocalDateTime fecha) {
        return fecha == null ? null : fecha.toInstant(ZoneOffset.UTC);
    }
}
