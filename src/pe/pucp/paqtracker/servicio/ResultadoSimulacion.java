package pe.pucp.paqtracker.servicio;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Resultado agregado de una simulacion dinamica: metricas de cumplimiento, uso
 * de flota y el detalle de los incumplimientos observados.
 */
public final class ResultadoSimulacion {

    private int totalEntregas;
    private int totalIncumplimientos;
    private double distanciaTotal;
    private int replanificaciones;
    private int picoUnidadesEnUso;
    private int instanteColapso;
    private int urgentesRepartidos;
    private final Map<String, Integer> usoPorTipo;
    private final List<String> detalleIncumplimientos;

    /**
     * Crea un resultado vacio, sin colapso registrado.
     */
    public ResultadoSimulacion() {
        this.instanteColapso = -1;
        this.usoPorTipo = new TreeMap<>();
        this.detalleIncumplimientos = new ArrayList<>();
    }

    public int getTotalEntregas() {
        return totalEntregas;
    }

    public void sumarEntregas(int cantidad) {
        this.totalEntregas += cantidad;
    }

    public int getTotalIncumplimientos() {
        return totalIncumplimientos;
    }

    public void sumarIncumplimientos(int cantidad) {
        this.totalIncumplimientos += cantidad;
    }

    public double getDistanciaTotal() {
        return distanciaTotal;
    }

    public void sumarDistancia(double distancia) {
        this.distanciaTotal += distancia;
    }

    public int getReplanificaciones() {
        return replanificaciones;
    }

    public void incrementarReplanificaciones() {
        this.replanificaciones++;
    }

    public int getPicoUnidadesEnUso() {
        return picoUnidadesEnUso;
    }

    public void actualizarPico(int enUso) {
        this.picoUnidadesEnUso = Math.max(this.picoUnidadesEnUso, enUso);
    }

    public int getInstanteColapso() {
        return instanteColapso;
    }

    public void registrarColapso(int instante) {
        if (this.instanteColapso < 0) {
            this.instanteColapso = instante;
        }
    }

    public int getUrgentesRepartidos() {
        return urgentesRepartidos;
    }

    /**
     * Registra un pedido urgente que se repartio entre varias unidades para
     * llegar dentro del plazo.
     */
    public void registrarReparto() {
        this.urgentesRepartidos++;
    }

    public Map<String, Integer> getUsoPorTipo() {
        return usoPorTipo;
    }

    public void registrarUso(String tipo) {
        this.usoPorTipo.merge(tipo, 1, Integer::sum);
    }

    public List<String> getDetalleIncumplimientos() {
        return detalleIncumplimientos;
    }
}
