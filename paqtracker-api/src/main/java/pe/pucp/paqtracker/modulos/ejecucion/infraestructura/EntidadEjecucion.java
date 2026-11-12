package pe.pucp.paqtracker.modulos.ejecucion.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Fila de la tabla {@code ejecucion}. Los enums se guardan como texto y los instantes como fecha y hora en
 * UTC. Las metricas y el colapso van en columnas embebidas; la conversion con el dominio vive en esta capa.
 */
@Entity
@Table(name = "ejecucion")
public class EntidadEjecucion {

    @Id
    @Column(name = "id", length = 40)
    private String id;

    @Column(name = "nombre", length = 120)
    private String nombre;

    @Column(name = "tipo_escenario", length = 30, nullable = false)
    private String tipoEscenario;

    @Column(name = "estado", length = 20, nullable = false)
    private String estado;

    @Column(name = "algoritmo", length = 10, nullable = false)
    private String algoritmo;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "dias", nullable = false)
    private int dias;

    @Column(name = "factor_aceleracion", nullable = false)
    private double factorAceleracion;

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn;

    @Column(name = "finalizada_en")
    private LocalDateTime finalizadaEn;

    @Column(name = "autos", nullable = false)
    private int autos;

    @Column(name = "motos", nullable = false)
    private int motos;

    @Column(name = "bicicletas", nullable = false)
    private int bicicletas;

    @Embedded
    private ColumnasResultado resultado;

    @Embedded
    private ColumnasColapso colapso;

    @Column(name = "origen_datos", length = 20, nullable = false)
    private String origenDatos;

    @Column(name = "semilla")
    private Long semilla;

    @Column(name = "parametros", length = 4000)
    private String parametros;

    @Column(name = "reloj_alcanzado")
    private LocalDateTime relojAlcanzado;

    /** Constructor requerido por JPA. */
    protected EntidadEjecucion() {
    }

    /**
     * @param registro ejecucion a guardar
     * @param creadaEn instante de creacion que conserva la fila, UTC
     */
    public EntidadEjecucion(RegistroEjecucion registro, LocalDateTime creadaEn) {
        this.id = registro.id();
        this.nombre = registro.nombre();
        this.tipoEscenario = registro.tipoEscenario().name();
        this.estado = registro.estado().name();
        this.algoritmo = registro.algoritmo();
        this.fechaInicio = registro.fechaInicio();
        this.horaInicio = registro.horaInicio();
        this.dias = registro.dias();
        this.factorAceleracion = registro.factorAceleracion();
        this.creadaEn = creadaEn;
        this.finalizadaEn = ColumnasColapso.aUtc(registro.finalizadaEn());
        this.autos = registro.autos();
        this.motos = registro.motos();
        this.bicicletas = registro.bicicletas();
        this.resultado = new ColumnasResultado(registro.resultado());
        this.colapso = new ColumnasColapso(registro.colapso());
        this.origenDatos = registro.origenDatos();
        this.semilla = registro.semilla();
        this.parametros = registro.parametros();
        this.relojAlcanzado = ColumnasColapso.aUtc(registro.relojAlcanzado());
    }

    public LocalDateTime getCreadaEn() {
        return creadaEn;
    }

    /**
     * @return la ejecucion guardada
     */
    public RegistroEjecucion aDominio() {
        // Hibernate deja en null una columna embebida cuyos campos son todos nulos (sin colapso).
        return new RegistroEjecucion(id, nombre, TipoEscenario.valueOf(tipoEscenario),
                EstadoEjecucion.valueOf(estado), algoritmo, fechaInicio, horaInicio, dias, factorAceleracion,
                ColumnasColapso.aInstante(creadaEn), ColumnasColapso.aInstante(finalizadaEn), autos, motos,
                bicicletas, resultado == null ? ResultadoEjecucion.VACIO : resultado.aDominio(),
                colapso == null ? null : colapso.aDominio(), origenDatos, semilla, parametros,
                ColumnasColapso.aInstante(relojAlcanzado));
    }
}
