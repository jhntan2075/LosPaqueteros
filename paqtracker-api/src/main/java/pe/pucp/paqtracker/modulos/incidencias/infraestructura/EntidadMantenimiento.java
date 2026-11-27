package pe.pucp.paqtracker.modulos.incidencias.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fila de la tabla {@code mantenimiento}: una intervencion del plan de mantenimiento preventivo.
 */
@Entity
@Table(name = "mantenimiento")
public class EntidadMantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "codigo_unidad", length = 10, nullable = false)
    private String codigoUnidad;

    @Column(name = "tipo_unidad", length = 12, nullable = false)
    private String tipoUnidad;

    @Column(name = "correlativo", nullable = false)
    private int correlativo;

    @Column(name = "cargado_en", nullable = false)
    private LocalDateTime cargadoEn;

    /** Constructor requerido por JPA. */
    protected EntidadMantenimiento() {
    }

    /**
     * @param fecha        dia en el taller
     * @param codigoUnidad codigo de la unidad en el archivo
     * @param tipoUnidad   nombre del tipo de la unidad (AUTO, MOTOCICLETA, BICICLETA)
     * @param correlativo  numero de la unidad dentro de su tipo
     * @param cargadoEn    instante real de la carga, UTC
     */
    public EntidadMantenimiento(LocalDate fecha, String codigoUnidad, String tipoUnidad, int correlativo,
                                LocalDateTime cargadoEn) {
        this.fecha = fecha;
        this.codigoUnidad = codigoUnidad;
        this.tipoUnidad = tipoUnidad;
        this.correlativo = correlativo;
        this.cargadoEn = cargadoEn;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public String getCodigoUnidad() {
        return codigoUnidad;
    }

    public String getTipoUnidad() {
        return tipoUnidad;
    }

    public int getCorrelativo() {
        return correlativo;
    }

    public LocalDateTime getCargadoEn() {
        return cargadoEn;
    }
}
