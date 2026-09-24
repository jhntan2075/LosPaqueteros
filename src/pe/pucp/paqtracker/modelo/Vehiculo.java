package pe.pucp.paqtracker.modelo;

/**
 * Unidad de transporte concreta de la flota.
 *
 * A diferencia de un modelo estatico, el almacen de origen no es un atributo
 * fijo: la posicion cambia a medida que la unidad completa rutas. Al inicio de
 * la operacion todas las unidades se encuentran en el almacen central. Una
 * unidad en transito deja de estar disponible y no entra en la planificacion
 * hasta que retorna a un almacen.
 */
public final class Vehiculo {

    private final int id;
    private final TipoVehiculo tipo;
    private Almacen posicion;
    private Nodo ubicacionActual;
    private EstadoVehiculo estado;

    /**
     * @param id       identificador de la unidad
     * @param tipo     tipo de unidad (define capacidad y velocidad)
     * @param posicion almacen en que se encuentra inicialmente
     */
    public Vehiculo(int id, TipoVehiculo tipo, Almacen posicion) {
        this.id = id;
        this.tipo = tipo;
        this.posicion = posicion;
        this.ubicacionActual = posicion.getUbicacion();
        this.estado = EstadoVehiculo.DISPONIBLE_EN_ALMACEN;
    }

    public int getId() {
        return id;
    }

    public TipoVehiculo getTipo() {
        return tipo;
    }

    public Almacen getPosicion() {
        return posicion;
    }

    /**
     * Fija el almacen de la unidad; sincroniza tambien su ubicacion real, que
     * hasta este punto puede haber quedado en un punto que no es un almacen
     * (ver {@link #fijarUbicacionAveria}).
     *
     * @param posicion almacen en que queda la unidad
     */
    public void setPosicion(Almacen posicion) {
        this.posicion = posicion;
        this.ubicacionActual = posicion.getUbicacion();
    }

    /**
     * @return el punto exacto de la malla en que se encuentra la unidad ahora,
     *         que puede no ser un almacen mientras esta averiada
     */
    public Nodo getUbicacionActual() {
        return ubicacionActual;
    }

    /**
     * Registra el punto exacto en que quedo inmovilizada la unidad por una
     * averia, sin alterar {@link #getPosicion()} (que en ese momento no es
     * relevante para el planificador, porque la unidad no esta disponible).
     *
     * @param ubicacion punto de la malla en que ocurrio la averia
     */
    public void fijarUbicacionAveria(Nodo ubicacion) {
        this.ubicacionActual = ubicacion;
    }

    public EstadoVehiculo getEstado() {
        return estado;
    }

    public void setEstado(EstadoVehiculo estado) {
        this.estado = estado;
    }

    /**
     * @return verdadero si la unidad esta libre en un almacen para planificar
     */
    public boolean estaDisponible() {
        return estado == EstadoVehiculo.DISPONIBLE_EN_ALMACEN;
    }

    public int getCapacidad() {
        return tipo.getCapacidad();
    }

    @Override
    public String toString() {
        return tipo + "#" + id;
    }
}
