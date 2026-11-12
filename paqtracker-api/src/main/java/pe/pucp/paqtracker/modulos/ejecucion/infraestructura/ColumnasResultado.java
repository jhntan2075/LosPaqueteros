package pe.pucp.paqtracker.modulos.ejecucion.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;

/**
 * Columnas de la tabla {@code ejecucion} con las metricas del resultado.
 */
@Embeddable
public class ColumnasResultado {

    @Column(name = "entregas", nullable = false)
    private int entregas;

    @Column(name = "incumplimientos", nullable = false)
    private int incumplimientos;

    @Column(name = "entregas_tarde", nullable = false)
    private int entregasTarde;

    @Column(name = "distancia_km", nullable = false)
    private double distanciaKm;

    @Column(name = "costo_total", nullable = false)
    private double costoTotal;

    @Column(name = "productos_entregados", nullable = false)
    private long productosEntregados;

    @Column(name = "productos_fuera_plazo", nullable = false)
    private long productosFueraPlazo;

    @Column(name = "retraso_total_min", nullable = false)
    private long retrasoTotalMin;

    @Column(name = "retraso_ponderado", nullable = false)
    private long retrasoPonderado;

    @Column(name = "replanificaciones", nullable = false)
    private int replanificaciones;

    @Column(name = "tiempo_computo_max_ms", nullable = false)
    private long tiempoComputoMaxMs;

    @Column(name = "tiempo_computo_total_ms", nullable = false)
    private long tiempoComputoTotalMs;

    @Column(name = "planificaciones_medidas", nullable = false)
    private int planificacionesMedidas;

    @Column(name = "pico_unidades", nullable = false)
    private int picoUnidades;

    @Column(name = "uso_autos", nullable = false)
    private int usoAutos;

    @Column(name = "uso_motos", nullable = false)
    private int usoMotos;

    @Column(name = "uso_bicicletas", nullable = false)
    private int usoBicicletas;

    @Column(name = "averias_atendidas", nullable = false)
    private int averiasAtendidas;

    /** Constructor requerido por JPA. */
    protected ColumnasResultado() {
    }

    /**
     * @param resultado metricas a guardar
     */
    public ColumnasResultado(ResultadoEjecucion resultado) {
        this.entregas = resultado.entregas();
        this.incumplimientos = resultado.incumplimientos();
        this.entregasTarde = resultado.entregasTarde();
        this.distanciaKm = resultado.distanciaKm();
        this.costoTotal = resultado.costoTotal();
        this.productosEntregados = resultado.productosEntregados();
        this.productosFueraPlazo = resultado.productosFueraPlazo();
        this.retrasoTotalMin = resultado.retrasoTotalMin();
        this.retrasoPonderado = resultado.retrasoPonderado();
        this.replanificaciones = resultado.replanificaciones();
        this.tiempoComputoMaxMs = resultado.tiempoComputoMaxMs();
        this.tiempoComputoTotalMs = resultado.tiempoComputoTotalMs();
        this.planificacionesMedidas = resultado.planificacionesMedidas();
        this.picoUnidades = resultado.picoUnidades();
        this.usoAutos = resultado.usoAutos();
        this.usoMotos = resultado.usoMotos();
        this.usoBicicletas = resultado.usoBicicletas();
        this.averiasAtendidas = resultado.averiasAtendidas();
    }

    /**
     * @return metricas guardadas
     */
    public ResultadoEjecucion aDominio() {
        return new ResultadoEjecucion(entregas, incumplimientos, entregasTarde, distanciaKm, costoTotal,
                productosEntregados, productosFueraPlazo, retrasoTotalMin, retrasoPonderado, replanificaciones,
                tiempoComputoMaxMs, tiempoComputoTotalMs, planificacionesMedidas, picoUnidades, usoAutos,
                usoMotos, usoBicicletas, averiasAtendidas);
    }
}
