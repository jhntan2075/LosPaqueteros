package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * Fila de la tabla {@code averia}: averias registradas manualmente. Los instantes se guardan en UTC.
 */
@Entity
@Table(name = "averia")
public class EntidadAveria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "ejecucion_id", length = 40, nullable = false)
    private String ejecucionId;

    @Column(name = "codigo_unidad", length = 10, nullable = false)
    private String codigoUnidad;

    @Column(name = "tipo", nullable = false)
    private int tipo;

    @Column(name = "instante", nullable = false)
    private LocalDateTime instante;

    @Column(name = "registrada_en", nullable = false)
    private LocalDateTime registradaEn;

    /** Constructor requerido por JPA. */
    protected EntidadAveria() {
    }

    /**
     * @param ejecucionId  ejecucion
     * @param codigoUnidad codigo visible de la unidad
     * @param tipo         severidad: 1, 2 o 3
     * @param instante     instante simulado de la averia, UTC
     * @param registradaEn instante real del registro, UTC
     */
    public EntidadAveria(String ejecucionId, String codigoUnidad, int tipo, LocalDateTime instante,
                         LocalDateTime registradaEn) {
        this.ejecucionId = ejecucionId;
        this.codigoUnidad = codigoUnidad;
        this.tipo = tipo;
        this.instante = instante;
        this.registradaEn = registradaEn;
    }

    public Long getId() {
        return id;
    }

    public String getEjecucionId() {
        return ejecucionId;
    }

    public String getCodigoUnidad() {
        return codigoUnidad;
    }

    public int getTipo() {
        return tipo;
    }

    public LocalDateTime getInstante() {
        return instante;
    }

    public LocalDateTime getRegistradaEn() {
        return registradaEn;
    }
}
