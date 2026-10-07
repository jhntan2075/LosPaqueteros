package pe.pucp.paqtracker.comun.configuracion;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Parametros de la operacion centralizados (prefijo {@code paqtracker} en application.yml). Todo valor
 * que puede variar entre entornos llega por variable de entorno; aqui no hay numeros magicos sueltos.
 *
 * @param datos        ubicacion de los archivos de entrada
 * @param ejecucion    reloj y ritmo de las ejecuciones
 * @param planificador algoritmo y semilla
 * @param semaforo     cortes del semaforo de holgura
 */
@ConfigurationProperties(prefix = "paqtracker")
public record PropiedadesDominio(Datos datos, Ejecucion ejecucion, Planificador planificador, Semaforo semaforo) {

    /**
     * @param ventas   carpeta con los archivos ventas.YYYYMM.txt
     * @param bloqueos carpeta con los archivos bloqueo.YYMM.txt
     */
    public record Datos(String ventas, String bloqueos) {
    }

    /**
     * @param zonaHoraria      zona horaria de la operacion (reloj real y fechas simuladas)
     * @param scSegundos       salto de consumo Sc: segundos reales entre dos difusiones del estado
     * @param saMinutos        salto del algoritmo Sa: minutos simulados entre dos planificaciones
     * @param factorPeriodo    factor de aceleracion k de la simulacion de periodo
     * @param factorColapso    factor de aceleracion k de la simulacion hasta el colapso
     * @param diasPeriodoMax   dias maximos de una simulacion de periodo
     * @param diasColapso      dias de datos que se cargan para buscar el colapso
     * @param maxPasosPorTick  pasos Sa como maximo por cada Sc, para no dejar de difundir si se atrasa
     * @param maxSimultaneas   simulaciones no terminadas que pueden existir a la vez, ademas del dia a dia
     * @param maxUnidadesPorTipo unidades de un mismo tipo que admite una flota configurada (LE-019)
     * @param diaADiaActivo    verdadero para arrancar la operacion dia a dia al iniciar la API
     */
    public record Ejecucion(String zonaHoraria, int scSegundos, int saMinutos, double factorPeriodo,
                            double factorColapso, int diasPeriodoMax, int diasColapso, int maxPasosPorTick,
                            int maxSimultaneas, int maxUnidadesPorTipo, boolean diaADiaActivo) {
    }

    /**
     * @param algoritmo algoritmo por defecto: GA o IACO
     * @param semilla   semilla base, para reproducibilidad
     */
    public record Planificador(String algoritmo, long semilla) {
    }

    /**
     * Cortes de los semaforos, como fracciones.
     *
     * @param fraccionRojo     holgura restante del pedido, sobre su plazo, bajo la que esta en rojo
     * @param fraccionAmbar    holgura restante del pedido, sobre su plazo, bajo la que esta en ambar
     * @param inventarioRojo   stock de un almacen intermedio, sobre su capacidad, bajo el que esta en rojo
     * @param inventarioAmbar  stock de un almacen intermedio, sobre su capacidad, bajo el que esta en ambar
     */
    public record Semaforo(double fraccionRojo, double fraccionAmbar, double inventarioRojo,
                           double inventarioAmbar) {
    }
}
