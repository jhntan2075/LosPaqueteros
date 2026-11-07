package pe.pucp.paqtracker.modulos.configuracion.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * Fila unica de la tabla {@code parametros_dominio}: los parametros en JSON. El instante se guarda en UTC.
 */
@Entity
@Table(name = "parametros_dominio")
public class EntidadParametrosDominio {

    /** Identificador de la unica fila de configuracion. */
    public static final int ID_UNICO = 1;

    @Id
    @Column(name = "id")
    private Integer id;

    @Column(name = "contenido", nullable = false, length = 4000)
    private String contenido;

    @Column(name = "actualizado_en")
    private LocalDateTime actualizadoEn;

    /** Constructor requerido por JPA. */
    protected EntidadParametrosDominio() {
    }

    /**
     * @param contenido     parametros en JSON
     * @param actualizadoEn instante del cambio en UTC
     */
    public EntidadParametrosDominio(String contenido, LocalDateTime actualizadoEn) {
        this.id = ID_UNICO;
        this.contenido = contenido;
        this.actualizadoEn = actualizadoEn;
    }

    /**
     * @return parametros en JSON
     */
    public String getContenido() {
        return contenido;
    }
}
