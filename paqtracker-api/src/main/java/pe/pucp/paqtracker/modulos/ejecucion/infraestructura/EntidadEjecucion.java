package pe.pucp.paqtracker.modulos.ejecucion.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fila de la tabla {@code ejecucion}. Los enums se guardan como texto y los instantes como fecha y
 * hora en UTC; la conversion vive en {@link RepositorioEjecucionJpa}.
 */
@Entity
@Table(name = "ejecucion")
public class EntidadEjecucion {

    @Id
    @Column(name = "id", length = 40)
    private String id;

    @Column(name = "tipo_escenario", length = 30, nullable = false)
    private String tipoEscenario;

    @Column(name = "estado", length = 20, nullable = false)
    private String estado;

    @Column(name = "algoritmo", length = 10, nullable = false)
    private String algoritmo;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "dias", nullable = false)
    private int dias;

    @Column(name = "factor_aceleracion", nullable = false)
    private double factorAceleracion;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    @Column(name = "finalizada_en")
    private LocalDateTime finalizadaEn;

    @Column(name = "entregas", nullable = false)
    private int entregas;

    @Column(name = "incumplimientos", nullable = false)
    private int incumplimientos;

    @Column(name = "fecha_colapso")
    private LocalDateTime fechaColapso;

    /** Constructor requerido por JPA. */
    protected EntidadEjecucion() {
    }

    /**
     * @param id                identificador
     * @param tipoEscenario     escenario
     * @param estado            estado
     * @param algoritmo         algoritmo
     * @param fechaInicio       primer dia del horizonte
     * @param dias              dias del horizonte
     * @param factorAceleracion factor k
     * @param creadaEn          creacion, UTC
     * @param finalizadaEn      termino, UTC, o null
     * @param entregas          entregas realizadas
     * @param incumplimientos   entregas fuera de plazo
     * @param fechaColapso      fecha simulada del colapso, UTC, o null
     */
    public EntidadEjecucion(String id, String tipoEscenario, String estado, String algoritmo, LocalDate fechaInicio,
                            int dias, double factorAceleracion, LocalDateTime creadaEn, LocalDateTime finalizadaEn,
                            int entregas, int incumplimientos, LocalDateTime fechaColapso) {
        this.id = id;
        this.tipoEscenario = tipoEscenario;
        this.estado = estado;
        this.algoritmo = algoritmo;
        this.fechaInicio = fechaInicio;
        this.dias = dias;
        this.factorAceleracion = factorAceleracion;
        this.creadaEn = creadaEn;
        this.finalizadaEn = finalizadaEn;
        this.entregas = entregas;
        this.incumplimientos = incumplimientos;
        this.fechaColapso = fechaColapso;
    }

    public String getId() {
        return id;
    }

    public String getTipoEscenario() {
        return tipoEscenario;
    }

    public String getEstado() {
        return estado;
    }

    public String getAlgoritmo() {
        return algoritmo;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public int getDias() {
        return dias;
    }

    public double getFactorAceleracion() {
        return factorAceleracion;
    }

    public LocalDateTime getCreadaEn() {
        return creadaEn;
    }

    public LocalDateTime getFinalizadaEn() {
        return finalizadaEn;
    }

    public int getEntregas() {
        return entregas;
    }

    public int getIncumplimientos() {
        return incumplimientos;
    }

    public LocalDateTime getFechaColapso() {
        return fechaColapso;
    }
}
