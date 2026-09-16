package pe.pucp.paqtracker.servicio;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.AlgoritmoMetaheuristico;
import pe.pucp.paqtracker.planificador.MemoriaFeromonas;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.planificador.PlanificadorIACO;
import pe.pucp.paqtracker.repositorio.CargadorBloqueos;
import pe.pucp.paqtracker.repositorio.CargadorPedidos;
import pe.pucp.paqtracker.util.Malla;
import pe.pucp.paqtracker.util.RangoFechas;
import java.util.ArrayList;
import java.util.List;
import java.util.function.LongFunction;
import java.util.logging.Logger;

/**
 * Punto de entrada de la simulacion dinamica sobre datos reales del proyecto.
 *
 * Uso:
        *   java pe.pucp.paqtracker.servicio.SimulacionDinamica ventas bloqueos dias [YYYYMM]
        *   java pe.pucp.paqtracker.servicio.SimulacionDinamica ventas bloqueos dd-MM-yyyy dd-MM-yyyy
 *
 * Ambas formas aceptan al final la opcion --algoritmo ga|iaco (por defecto ga)
 * para elegir el planificador que corre en cada ciclo.
 *
 * El archivo de ventas debe tener el instante de registro en minutos absolutos
 * del mes, para casar con las ventanas de vigencia de los bloqueos.
 */
public final class SimulacionDinamica {

    private static final Logger LOGGER = Logger.getLogger(SimulacionDinamica.class.getName());

    private static final int SA_MINUTOS = 30;
    private static final long SEMILLA = 1;
    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MARGEN_CIERRE = 3000;
    private static final int DIAS_POR_DEFECTO = 7;
    private static final String OPCION_ALGORITMO = "--algoritmo";
    private static final String ALGORITMO_GA = "ga";
    private static final String ALGORITMO_IACO = "iaco";

    /**
     * Ejecuta la simulacion con los argumentos de linea de comandos.
     *
     * @param args ruta de ventas, ruta de bloqueos y numero de dias
     * @throws Exception si ocurre un error al leer los archivos de entrada
     */
    public static void main(String[] args) throws Exception {
        String algoritmo = extraerAlgoritmo(args);
        args = sinOpcionAlgoritmo(args);
        String rutaVentas = args.length > 0 ? args[0] : "ventas.txt";
        String rutaBloqueos = args.length > 1 ? args[1] : null;
        boolean usaRangoFechas = args.length > 3 && !esEntero(args[2]);
        int dias = usaRangoFechas ? 0
                : args.length > 2 ? Integer.parseInt(args[2]) : DIAS_POR_DEFECTO;
        String mes = !usaRangoFechas && args.length > 3 ? args[3] : null;

        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(almacenes.get(0));
        RangoFechas rango = usaRangoFechas
                ? RangoFechas.parsear(args[2], args[3]) : null;
        int horizonte = rango != null ? rango.duracionMinutos() : dias * MINUTOS_POR_DIA;
        List<Pedido> pedidos = rango != null
                ? CargadorPedidos.cargarEnRango(rutaVentas, rango)
                : CargadorPedidos.cargar(rutaVentas, horizonte, mes);
        Malla malla = rutaBloqueos != null
                ? new Malla(rango != null
                        ? CargadorBloqueos.cargarEnRango(rutaBloqueos, rango)
                        : CargadorBloqueos.cargar(rutaBloqueos, mes))
                : new Malla();

        Orquestador orquestador = new Orquestador(almacenes, flota, pedidos, malla,
                SA_MINUTOS, ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS,
                ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS, SEMILLA,
                fabricaAlgoritmo(algoritmo));
        ResultadoSimulacion resultado = orquestador.simular(horizonte + MARGEN_CIERRE);

        int diasInforme = rango != null
                ? (horizonte + MINUTOS_POR_DIA - 1) / MINUTOS_POR_DIA : dias;
        informar(algoritmo, resultado, pedidos.size(), flota.size(), diasInforme);
    }

    /**
     * Crea la fabrica del algoritmo elegido. El IACO recibe una sola memoria de
     * feromonas para toda la simulacion, de modo que el aprendizaje persista
     * entre ciclos.
     *
     * @param algoritmo nombre del algoritmo: ga o iaco
     * @return fabrica que crea el algoritmo de cada ciclo a partir de su semilla
     */
    private static LongFunction<AlgoritmoMetaheuristico> fabricaAlgoritmo(String algoritmo) {
        switch (algoritmo) {
            case ALGORITMO_GA:
                return PlanificadorGA::new;
            case ALGORITMO_IACO:
                MemoriaFeromonas memoria = PlanificadorIACO.crearMemoria();
                return semilla -> new PlanificadorIACO(semilla, memoria);
            default:
                throw new IllegalArgumentException("Algoritmo desconocido: " + algoritmo
                        + " (use " + ALGORITMO_GA + " o " + ALGORITMO_IACO + ")");
        }
    }

    /**
     * @param args argumentos de linea de comandos
     * @return valor de la opcion --algoritmo en minusculas, o ga si no se indica
     */
    private static String extraerAlgoritmo(String[] args) {
        for (int i = 0; i + 1 < args.length; i++) {
            if (OPCION_ALGORITMO.equals(args[i])) {
                return args[i + 1].toLowerCase();
            }
        }
        return ALGORITMO_GA;
    }

    /**
     * @param args argumentos de linea de comandos
     * @return argumentos posicionales, sin la opcion --algoritmo ni su valor
     */
    private static String[] sinOpcionAlgoritmo(String[] args) {
        List<String> posicionales = new ArrayList<>();
        for (int i = 0; i < args.length; i++) {
            if (OPCION_ALGORITMO.equals(args[i])) {
                i++;
                continue;
            }
            posicionales.add(args[i]);
        }
        return posicionales.toArray(new String[0]);
    }

    /**
     * Registra en el log el resumen de la simulacion.
     *
     * @param algoritmo    nombre del algoritmo simulado
     * @param resultado    resultado agregado
     * @param totalPedidos cantidad de pedidos del horizonte
     * @param tamanoFlota  cantidad de unidades de la flota
     * @param dias         horizonte en dias
     */
    private static void informar(String algoritmo, ResultadoSimulacion resultado, int totalPedidos,
                                 int tamanoFlota, int dias) {
        double cumplimiento = 100.0
                * (resultado.getTotalEntregas() - resultado.getTotalIncumplimientos()) / totalPedidos;
        StringBuilder informe = new StringBuilder();
        informe.append(String.format("Simulacion dinamica (%s): %d dias, Sa=%d min%n",
                algoritmo.toUpperCase(), dias, SA_MINUTOS));
        informe.append(String.format("Entregas: %d de %d%n", resultado.getTotalEntregas(), totalPedidos));
        informe.append(String.format("Incumplimientos: %d (cumplimiento %.2f%%)%n",
                resultado.getTotalIncumplimientos(), cumplimiento));
        informe.append(String.format("Colapso logistico: %s%n",
                resultado.getInstanteColapso() < 0
                        ? "no hubo"
                        : "t=" + resultado.getInstanteColapso() + " min"));
        informe.append(String.format("Replanificaciones: %d%n", resultado.getReplanificaciones()));
        informe.append(String.format("Pico unidades en uso: %d de %d%n",
                resultado.getPicoUnidadesEnUso(), tamanoFlota));
        informe.append(String.format("Uso por tipo: %s%n", resultado.getUsoPorTipo()));
        informe.append(String.format("Urgentes repartidos en varias unidades: %d%n",
                resultado.getUrgentesRepartidos()));
        informe.append(String.format("Distancia total: %.0f", resultado.getDistanciaTotal()));
        LOGGER.info(informe.toString());
        for (String detalle : resultado.getDetalleIncumplimientos()) {
            LOGGER.info("Incumplimiento: " + detalle);
        }
    }

    /**
     * Indica si un texto es parseable como entero.
     *
     * @param valor texto a evaluar
     * @return true si valor se puede parsear como entero
     */
    private static boolean esEntero(String valor) {
        try {
            Integer.parseInt(valor);
            return true;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private SimulacionDinamica() {
    }
}
