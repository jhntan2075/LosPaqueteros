package pe.pucp.paqtracker.modulos.pedidos.infraestructura;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * Fila de la tabla {@code pedido}: pedidos registrados manualmente. Los instantes se guardan en UTC.
 */
@Entity
@Table(name = "pedido")
public class EntidadPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "ejecucion_id", length = 40, nullable = false)
    private String ejecucionId;

    @Column(name = "id_en_ejecucion", nullable = false)
    private int idEnEjecucion;

    @Column(name = "cliente", length = 80, nullable = false)
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

    /** Constructor requerido por JPA. */
    protected EntidadPedido() {
    }

    /**
     * @param ejecucionId   ejecucion
     * @param idEnEjecucion identificador del pedido en la ejecucion
     * @param cliente       cliente
     * @param destinoX      coordenada horizontal del destino
     * @param destinoY      coordenada vertical del destino
     * @param cantidad      paquetes
     * @param plazoHoras    plazo de entrega
     * @param registradoEn  registro simulado, UTC
     * @param horaLimite    hora limite simulada, UTC
     */
    public EntidadPedido(String ejecucionId, int idEnEjecucion, String cliente, int destinoX, int destinoY,
                         int cantidad, int plazoHoras, LocalDateTime registradoEn, LocalDateTime horaLimite) {
        this.ejecucionId = ejecucionId;
        this.idEnEjecucion = idEnEjecucion;
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

    public String getEjecucionId() {
        return ejecucionId;
    }

    public int getIdEnEjecucion() {
        return idEnEjecucion;
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
}
