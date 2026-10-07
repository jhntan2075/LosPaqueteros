package pe.pucp.paqtracker.modelo;

import pe.pucp.paqtracker.util.Malla;
import java.util.List;

/**
 * Escenario operativo sobre el que trabaja el planificador en un ciclo: los
 * almacenes, las unidades disponibles, las entregas por atender, el instante
 * actual del reloj y la malla con los bloqueos vigentes. Corresponde a la
 * instancia del problema en un momento dado.
 */
public final class EscenarioOperativo {

    private final List<Almacen> almacenes;
    private final List<Vehiculo> flotaDisponible;
    private final List<Entrega> entregas;
    private final int instanteActual;
    private final int plazoMaximo;
    private final Malla malla;
    private final int tiempoServicio;

    /**
     * @param almacenes       almacenes del sistema
     * @param flotaDisponible unidades libres para planificar
     * @param entregas        entregas por atender en este ciclo
     * @param instanteActual  minuto absoluto del reloj al planificar
     * @param plazoMaximo     plazo maximo del catalogo, para ponderar urgencia
     * @param malla           malla con bloqueos vigentes
     * @param tiempoServicio  minutos de acondicionamiento por entrega
     */
    public EscenarioOperativo(List<Almacen> almacenes, List<Vehiculo> flotaDisponible,
                              List<Entrega> entregas, int instanteActual, int plazoMaximo,
                              Malla malla, int tiempoServicio) {
        this.almacenes = almacenes;
        this.flotaDisponible = flotaDisponible;
        this.entregas = entregas;
        this.instanteActual = instanteActual;
        this.plazoMaximo = plazoMaximo;
        this.malla = malla;
        this.tiempoServicio = tiempoServicio;
    }

    public List<Almacen> getAlmacenes() {
        return almacenes;
    }

    public List<Vehiculo> getFlotaDisponible() {
        return flotaDisponible;
    }

    public List<Entrega> getEntregas() {
        return entregas;
    }

    public int getInstanteActual() {
        return instanteActual;
    }

    public int getPlazoMaximo() {
        return plazoMaximo;
    }

    public Malla getMalla() {
        return malla;
    }

    public int getTiempoServicio() {
        return tiempoServicio;
    }
}
