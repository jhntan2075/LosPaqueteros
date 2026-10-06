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
    private double costoTotal;
    private double fitnessAcumulado;
    private long retrasoTotalMinutos;
    private int entregasTarde;
    private long holguraTotalMinutos;
    private int entregasATiempo;
    private long productosEntregados;
    private long productosFueraDePlazo;
    private long retrasoPonderadoPorProductos;
    private long tiempoComputoMaximoMs;
    private long tiempoComputoTotalMs;
    private int ejecucionesMedidas;
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

    public double getCostoTotal() {
        return costoTotal;
    }

    public void sumarCosto(double costo) {
        this.costoTotal += costo;
    }

    /**
     * @return suma del fitness de los planes despachados hasta el momento
     */
    public double getFitnessAcumulado() {
        return fitnessAcumulado;
    }

    /**
     * Acumula el fitness del plan elegido en un ciclo de planificacion. Es la
     * variable respuesta primaria del experimento numerico: el fitness
     * acumulado hasta cada corte de la simulacion.
     *
     * @param fitness fitness del plan despachado en el ciclo
     */
    public void sumarFitness(double fitness) {
        this.fitnessAcumulado += fitness;
    }

    /**
     * Registra el margen con que llega una entrega despachada. Separa las dos
     * poblaciones que interesan a la calibracion: las que llegan tarde aportan
     * al retraso promedio y las que llegan a tiempo, a la holgura promedio.
     *
     * @param holgura minutos entre la llegada y la hora limite; negativa si llega tarde
     */
    public void registrarMargenEntrega(int holgura, int productos) {
        this.productosEntregados += productos;
        if (holgura < 0) {
            this.retrasoTotalMinutos += -holgura;
            this.entregasTarde++;
            this.productosFueraDePlazo += productos;
            this.retrasoPonderadoPorProductos += (long) -holgura * productos;
            return;
        }
        this.holguraTotalMinutos += holgura;
        this.entregasATiempo++;
    }

    /**
     * @return unidades de producto despachadas, contadas sobre las entregas que
     *         salieron en una ruta
     */
    public long getProductosEntregados() {
        return productosEntregados;
    }

    /**
     * @return unidades de producto que llegaron despues de su hora limite
     */
    public long getProductosFueraDePlazo() {
        return productosFueraDePlazo;
    }

    /**
     * Retraso promedio ponderado por la cantidad de producto: un pedido grande
     * que llega tarde pesa mas que uno pequeño. Es la metrica de decision del
     * experimento, porque la unidad del dominio es el producto.
     *
     * @return minutos de retraso promedio por producto afectado, o cero si no
     *         hubo entregas tardias
     */
    public double getRetrasoPromedioPonderadoMinutos() {
        return productosFueraDePlazo == 0 ? 0.0
                : (double) retrasoPonderadoPorProductos / productosFueraDePlazo;
    }

    /**
     * @return minutos de retraso promedio entre las entregas que llegaron tarde,
     *         o cero si todas llegaron dentro del plazo
     */
    public double getRetrasoPromedioMinutos() {
        return entregasTarde == 0 ? 0.0 : (double) retrasoTotalMinutos / entregasTarde;
    }

    /**
     * @return holgura promedio, en minutos, de las entregas que llegaron dentro
     *         del plazo, o cero si no hubo ninguna
     */
    public double getHolguraPromedioMinutos() {
        return entregasATiempo == 0 ? 0.0 : (double) holguraTotalMinutos / entregasATiempo;
    }

    /**
     * Registra el tiempo de computo Ta de una ejecucion del planificador (LE-059).
     *
     * @param milisegundos tiempo real que tomo la planificacion
     */
    public void registrarTiempoComputo(long milisegundos) {
        this.tiempoComputoMaximoMs = Math.max(this.tiempoComputoMaximoMs, milisegundos);
        this.tiempoComputoTotalMs += milisegundos;
        this.ejecucionesMedidas++;
    }

    public long getTiempoComputoMaximoMs() {
        return tiempoComputoMaximoMs;
    }

    /**
     * @return tiempo de computo acumulado por el planificador, en milisegundos
     */
    public long getTiempoComputoTotalMs() {
        return tiempoComputoTotalMs;
    }

    /**
     * @return Ta promedio en milisegundos, o cero si no hubo ejecuciones
     */
    public double getTiempoComputoPromedioMs() {
        return ejecucionesMedidas == 0 ? 0.0 : (double) tiempoComputoTotalMs / ejecucionesMedidas;
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
