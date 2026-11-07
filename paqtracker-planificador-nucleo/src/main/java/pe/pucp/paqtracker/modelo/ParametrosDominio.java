package pe.pucp.paqtracker.modelo;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Parametros del dominio que el operador puede configurar (B02, B04, B07-B09): ubicacion y capacidad de
 * los almacenes, capacidad, velocidad y costo de cada tipo de unidad, y duraciones de las averias. Cada
 * ejecucion copia la version vigente al crearse, asi que un cambio nunca altera una ejecucion en curso.
 * {@link #porDefecto()} devuelve los valores de {@link ConfiguracionDominio}, que siguen rigiendo para la
 * experimentacion. Se valida al construirse: no existen parametros incoherentes.
 *
 * @param almacenes almacenes en orden de id: el 0 es el central (stock ilimitado) y el resto intermedios
 * @param unidades  parametros de cada tipo de unidad; deben estar los tres tipos
 * @param averias   duraciones de las averias
 */
public record ParametrosDominio(List<ParametrosAlmacen> almacenes, Map<TipoVehiculo, ParametrosUnidad> unidades,
                                ParametrosAveria averias) {

    /** Cantidad de almacenes del proyecto: el central y dos intermedios. */
    public static final int CANTIDAD_ALMACENES = 3;
    /** Mayor capacidad admitida para un almacen intermedio. */
    public static final int CAPACIDAD_ALMACEN_MAXIMA = 100_000;
    /** Mayor capacidad admitida para una unidad, en paquetes. */
    public static final int CAPACIDAD_UNIDAD_MAXIMA = 500;
    /** Mayor velocidad admitida para una unidad, en km/h. */
    public static final int VELOCIDAD_MAXIMA = 120;
    /** Mayor duracion admitida para una etapa de averia, en minutos (30 dias). */
    public static final int DURACION_AVERIA_MAXIMA = 30 * 1440;

    /**
     * @throws IllegalArgumentException si algun parametro esta fuera de rango o es incoherente
     */
    public ParametrosDominio {
        if (almacenes == null || unidades == null || averias == null) {
            throw new IllegalArgumentException("Faltan parámetros: se esperan almacenes, unidades y averías");
        }
        almacenes = List.copyOf(almacenes);
        validarAlmacenes(almacenes);
        EnumMap<TipoVehiculo, ParametrosUnidad> copia = new EnumMap<>(TipoVehiculo.class);
        for (TipoVehiculo tipo : TipoVehiculo.values()) {
            ParametrosUnidad parametros = unidades.get(tipo);
            if (parametros == null) {
                throw new IllegalArgumentException("Faltan los parámetros de la unidad " + tipo);
            }
            copia.put(tipo, parametros);
        }
        unidades = java.util.Collections.unmodifiableMap(copia);
    }

    /**
     * @return los valores historicos de {@link ConfiguracionDominio}
     */
    public static ParametrosDominio porDefecto() {
        List<ParametrosAlmacen> almacenes = new ArrayList<>();
        for (Almacen almacen : ConfiguracionDominio.crearAlmacenes()) {
            almacenes.add(new ParametrosAlmacen(almacen.getUbicacion().getX(), almacen.getUbicacion().getY(),
                    almacen.esIlimitado() ? 0 : almacen.getCapacidadMaxima()));
        }
        Map<TipoVehiculo, ParametrosUnidad> unidades = new EnumMap<>(TipoVehiculo.class);
        for (TipoVehiculo tipo : TipoVehiculo.values()) {
            unidades.put(tipo, ParametrosUnidad.de(tipo));
        }
        return new ParametrosDominio(almacenes, unidades, ParametrosAveria.porDefecto());
    }

    /**
     * @param tipo tipo de unidad
     * @return sus parametros
     */
    public ParametrosUnidad unidad(TipoVehiculo tipo) {
        return unidades.get(tipo);
    }

    private static void validarAlmacenes(List<ParametrosAlmacen> almacenes) {
        if (almacenes.size() != CANTIDAD_ALMACENES) {
            throw new IllegalArgumentException("Se esperan " + CANTIDAD_ALMACENES
                    + " almacenes (central, intermedio 1 e intermedio 2) y llegaron " + almacenes.size());
        }
        Set<String> nodos = new HashSet<>();
        for (int i = 0; i < almacenes.size(); i++) {
            ParametrosAlmacen almacen = almacenes.get(i);
            String nombre = i == 0 ? "El almacén central" : "El intermedio " + i;
            if (almacen == null) {
                throw new IllegalArgumentException(nombre + " no tiene parámetros");
            }
            if (almacen.x() < 0 || almacen.x() > ConfiguracionDominio.MALLA_ANCHO || almacen.y() < 0
                    || almacen.y() > ConfiguracionDominio.MALLA_ALTO) {
                throw new IllegalArgumentException(nombre + " (" + almacen.x() + ", " + almacen.y()
                        + ") está fuera de la malla de " + ConfiguracionDominio.MALLA_ANCHO + " × "
                        + ConfiguracionDominio.MALLA_ALTO + " km");
            }
            if (!nodos.add(almacen.x() + "," + almacen.y())) {
                throw new IllegalArgumentException(nombre + " está en el mismo nodo que otro almacén ("
                        + almacen.x() + ", " + almacen.y() + ")");
            }
            if (i > 0 && (almacen.capacidad() < 1 || almacen.capacidad() > CAPACIDAD_ALMACEN_MAXIMA)) {
                throw new IllegalArgumentException(nombre + ": la capacidad debe estar entre 1 y "
                        + CAPACIDAD_ALMACEN_MAXIMA + " paquetes y es " + almacen.capacidad());
            }
        }
    }

    /**
     * Ubicacion y capacidad de un almacen.
     *
     * @param x         coordenada X en la malla
     * @param y         coordenada Y en la malla
     * @param capacidad stock al que se recarga cada dia; se ignora en el central, que es ilimitado
     */
    public record ParametrosAlmacen(int x, int y, int capacidad) {
    }

    /**
     * Atributos de un tipo de unidad (LE-020 a LE-022).
     *
     * @param capacidad    paquetes que transporta
     * @param velocidadKmH velocidad de desplazamiento
     * @param costoPorKm   costo por kilometro recorrido
     */
    public record ParametrosUnidad(int capacidad, int velocidadKmH, double costoPorKm) {

        /**
         * @throws IllegalArgumentException si algun valor esta fuera de rango
         */
        public ParametrosUnidad {
            if (capacidad < 1 || capacidad > CAPACIDAD_UNIDAD_MAXIMA) {
                throw new IllegalArgumentException("La capacidad de una unidad debe estar entre 1 y "
                        + CAPACIDAD_UNIDAD_MAXIMA + " paquetes y es " + capacidad);
            }
            if (velocidadKmH < 1 || velocidadKmH > VELOCIDAD_MAXIMA) {
                throw new IllegalArgumentException("La velocidad de una unidad debe estar entre 1 y "
                        + VELOCIDAD_MAXIMA + " km/h y es " + velocidadKmH);
            }
            if (!Double.isFinite(costoPorKm) || costoPorKm < 0) {
                throw new IllegalArgumentException("El costo por km no puede ser negativo: " + costoPorKm);
            }
        }

        /**
         * @param tipo tipo de unidad
         * @return los valores historicos del tipo
         */
        public static ParametrosUnidad de(TipoVehiculo tipo) {
            return new ParametrosUnidad(tipo.getCapacidad(), tipo.getVelocidad(), tipo.getCostoPorKm());
        }
    }

    /**
     * Duraciones de las averias (LE-incidencias). La reincorporacion del tipo 2 (fin del turno siguiente) y
     * del tipo 3 (turno de las 15:00) sigue la regla de turnos; aqui se configuran los plazos.
     *
     * @param tipo1Minutos            detencion en el sitio de una averia tipo 1, tras la que sigue operando
     * @param permanenciaSitioMinutos minutos en el sitio de una averia tipo 2 o 3 antes del traslado al central
     * @param tipo3MinimoMinutos      minutos minimos de no disponibilidad de una averia tipo 3
     * @param trasvaseMinutos         minutos que toma trasvasar la carga a otra unidad en el punto de la averia
     */
    public record ParametrosAveria(int tipo1Minutos, int permanenciaSitioMinutos, int tipo3MinimoMinutos,
                                   int trasvaseMinutos) {

        /**
         * @throws IllegalArgumentException si una duracion no es positiva o las duraciones son incoherentes
         */
        public ParametrosAveria {
            positiva("La detención de la avería tipo 1", tipo1Minutos);
            positiva("La permanencia en el sitio (tipo 2 y 3)", permanenciaSitioMinutos);
            positiva("La duración mínima de la avería tipo 3", tipo3MinimoMinutos);
            positiva("El trasvase", trasvaseMinutos);
            if (trasvaseMinutos >= tipo1Minutos || trasvaseMinutos >= permanenciaSitioMinutos) {
                throw new IllegalArgumentException("El trasvase (" + trasvaseMinutos + " min) debe ser más corto "
                        + "que la detención de cada avería: debe terminar antes de que la unidad averiada se vaya");
            }
            if (tipo3MinimoMinutos < permanenciaSitioMinutos) {
                throw new IllegalArgumentException("La avería tipo 3 (" + tipo3MinimoMinutos + " min) no puede "
                        + "durar menos que su permanencia en el sitio (" + permanenciaSitioMinutos + " min)");
            }
        }

        /**
         * @return los valores historicos de {@link ConfiguracionDominio}
         */
        public static ParametrosAveria porDefecto() {
            return new ParametrosAveria(ConfiguracionDominio.AVERIA_TIPO1_MINUTOS,
                    ConfiguracionDominio.AVERIA_PERMANENCIA_SITIO_MINUTOS,
                    ConfiguracionDominio.AVERIA_TIPO3_MINIMO_MINUTOS, ConfiguracionDominio.TRASVASE_MINUTOS);
        }

        private static void positiva(String nombre, int minutos) {
            if (minutos < 1 || minutos > DURACION_AVERIA_MAXIMA) {
                throw new IllegalArgumentException(nombre + " debe estar entre 1 y " + DURACION_AVERIA_MAXIMA
                        + " minutos y es " + minutos);
            }
        }
    }
}
