package pe.pucp.paqtracker.modulos.configuracion.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;
import java.time.LocalDateTime;

/**
 * Fila unica de la tabla {@code rangos_semaforo}. El instante de actualizacion se guarda en UTC.
 */
@Entity
@Table(name = "rangos_semaforo")
public class EntidadRangosSemaforo {

    /** Identificador de la unica fila de configuracion. */
    public static final int ID_UNICO = 1;

    @Id
    @Column(name = "id")
    private Integer id;

    @Column(name = "holgura_rojo", nullable = false)
    private double holguraRojo;

    @Column(name = "holgura_ambar", nullable = false)
    private double holguraAmbar;

    @Column(name = "inventario_rojo", nullable = false)
    private double inventarioRojo;

    @Column(name = "inventario_ambar", nullable = false)
    private double inventarioAmbar;

    @Column(name = "ocupacion_unidad_vacio", nullable = false)
    private double ocupacionUnidadVacio;

    @Column(name = "ocupacion_unidad_ambar", nullable = false)
    private double ocupacionUnidadAmbar;

    @Column(name = "ocupacion_unidad_rojo", nullable = false)
    private double ocupacionUnidadRojo;

    @Column(name = "ocupacion_almacen_vacio", nullable = false)
    private double ocupacionAlmacenVacio;

    @Column(name = "ocupacion_almacen_ambar", nullable = false)
    private double ocupacionAlmacenAmbar;

    @Column(name = "ocupacion_almacen_rojo", nullable = false)
    private double ocupacionAlmacenRojo;

    @Column(name = "actualizado_en")
    private LocalDateTime actualizadoEn;

    /** Constructor requerido por JPA. */
    protected EntidadRangosSemaforo() {
    }

    /**
     * @param rangos        rangos a guardar
     * @param actualizadoEn instante del cambio en UTC; null para la carga inicial
     */
    public EntidadRangosSemaforo(RangosSemaforo rangos, LocalDateTime actualizadoEn) {
        this.id = ID_UNICO;
        this.holguraRojo = rangos.holgura().rojo();
        this.holguraAmbar = rangos.holgura().ambar();
        this.inventarioRojo = rangos.inventario().rojo();
        this.inventarioAmbar = rangos.inventario().ambar();
        this.ocupacionUnidadVacio = rangos.ocupacionUnidad().vacio();
        this.ocupacionUnidadAmbar = rangos.ocupacionUnidad().ambar();
        this.ocupacionUnidadRojo = rangos.ocupacionUnidad().rojo();
        this.ocupacionAlmacenVacio = rangos.ocupacionAlmacen().vacio();
        this.ocupacionAlmacenAmbar = rangos.ocupacionAlmacen().ambar();
        this.ocupacionAlmacenRojo = rangos.ocupacionAlmacen().rojo();
        this.actualizadoEn = actualizadoEn;
    }

    /**
     * @return rangos de la fila, validados
     */
    public RangosSemaforo aDominio() {
        return new RangosSemaforo(new RangosSemaforo.CortesPorDebajo(holguraRojo, holguraAmbar),
                new RangosSemaforo.CortesPorDebajo(inventarioRojo, inventarioAmbar),
                new RangosSemaforo.CortesCarga(ocupacionUnidadVacio, ocupacionUnidadAmbar, ocupacionUnidadRojo),
                new RangosSemaforo.CortesCarga(ocupacionAlmacenVacio, ocupacionAlmacenAmbar, ocupacionAlmacenRojo));
    }
}
