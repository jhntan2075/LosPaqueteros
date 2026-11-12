package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * Fila de la tabla {@code pedido}. Los instantes se guardan en UTC. Los pedidos de archivo se insertan por
 * lotes con JDBC ({@link RepositorioPedidoJpa}); esta entidad sirve para leerlos y para los manuales.
 */
@Entity
@Table(name = "pedido")
public class EntidadPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "origen", length = 20, nullable = false)
    private String origen;

    @Column(name = "lote", length = 40)
    private String lote;

    @Column(name = "mes_archivo", length = 6)
    private String mesArchivo;

    @Column(name = "orden")
    private Integer orden;

    @Column(name = "ejecucion_id", length = 40)
    private String ejecucionId;

    @Column(name = "cliente", length = 80)
    private String cliente;

    @Column(name = "destino_x", nullable = false)
    private int destinoX;

    @Column(name = "destino_y", nullable = false)
    private int destinoY;

    @Column(name = "cantidad", nullable = false)
    private int cantidad;

    @Column(name = "plazo_horas", nullable = false)
    private int plazoHoras;

    @Column(name = "registrado_en", nullable = false)
    private LocalDateTime registradoEn;

    @Column(name = "hora_limite", nullable = false)
    private LocalDateTime horaLimite;

    @Column(name = "estado", length = 20)
    private String estado;

    @Column(name = "cantidad_entregada", nullable = false)
    private int cantidadEntregada;

    @Column(name = "entregado_en")
    private LocalDateTime entregadoEn;

    @Column(name = "retraso_minutos")
    private Integer retrasoMinutos;

    /** Constructor requerido por JPA. */
    protected EntidadPedido() {
    }

    /**
     * Pedido manual, recien registrado.
     *
     * @param ejecucionId ejecucion del dia a dia en la que entra
     * @param cliente     cliente
     * @param destinoX    coordenada horizontal del destino
     * @param destinoY    coordenada vertical del destino
     * @param cantidad    paquetes
     * @param plazoHoras  plazo de entrega
     * @param registradoEn registro, UTC
     * @param horaLimite  hora limite, UTC
     */
    public EntidadPedido(String ejecucionId, String cliente, int destinoX, int destinoY, int cantidad,
                         int plazoHoras, LocalDateTime registradoEn, LocalDateTime horaLimite) {
        this.origen = "MANUAL";
        this.ejecucionId = ejecucionId;
        this.cliente = cliente;
        this.destinoX = destinoX;
        this.destinoY = destinoY;
        this.cantidad = cantidad;
        this.plazoHoras = plazoHoras;
        this.registradoEn = registradoEn;
        this.horaLimite = horaLimite;
    }

    public Long getId() {
        return id;
    }

    public String getOrigen() {
        return origen;
    }

    public String getLote() {
        return lote;
    }

    public String getMesArchivo() {
        return mesArchivo;
    }

    public Integer getOrden() {
        return orden;
    }

    public String getEjecucionId() {
        return ejecucionId;
    }

    public String getCliente() {
        return cliente;
    }

    public int getDestinoX() {
        return destinoX;
    }

    public int getDestinoY() {
        return destinoY;
    }

    public int getCantidad() {
        return cantidad;
    }

    public int getPlazoHoras() {
        return plazoHoras;
    }

    public LocalDateTime getRegistradoEn() {
        return registradoEn;
    }

    public LocalDateTime getHoraLimite() {
        return horaLimite;
    }

    public String getEstado() {
        return estado;
    }

    public int getCantidadEntregada() {
        return cantidadEntregada;
    }

    public LocalDateTime getEntregadoEn() {
        return entregadoEn;
    }

    public Integer getRetrasoMinutos() {
        return retrasoMinutos;
    }
}
