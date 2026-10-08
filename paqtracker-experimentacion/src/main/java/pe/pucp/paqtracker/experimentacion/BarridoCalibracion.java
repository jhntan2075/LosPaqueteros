package pe.pucp.paqtracker.experimentacion;

import pe.pucp.paqtracker.lectura.CargadorBloqueos;
import pe.pucp.paqtracker.lectura.CargadorPedidos;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.ParametrosGA;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.planificador.comun.ContadorEvaluaciones;
import pe.pucp.paqtracker.planificador.comun.PesosFitness;
import pe.pucp.paqtracker.simulacion.Orquestador;
import pe.pucp.paqtracker.simulacion.ResultadoSimulacion;
import pe.pucp.paqtracker.util.Malla;
import pe.pucp.paqtracker.util.RangoFechas;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Barrido univariado (OFAT) de un peso de la funcion objetivo, para la etapa 1
 * del experimento numerico. Mueve un solo peso a la vez dejando los otros tres
 * en su valor vigente, corre el GA sobre los escenarios de calibracion y emite
 * una fila por corrida.
 *
 * No registra el fitness a proposito: su escala cambia con el peso que se barre,
 * de modo que no es comparable entre valores. Se registran en cambio las
 * metricas de operacion, que si son comparables.
 *
 * El barrido se detiene al terminar el peso pedido: la eleccion del codo es una
 * decision humana y el valor elegido se pasa como valor fijo al barrido del
 * peso siguiente.
 */
public final class BarridoCalibracion {

    /** Cabecera del registro de calibracion. */
    public static final String CABECERA = "escenario,peso_barrido,valor_peso,repeticion,semilla,"
            + "pct_pedidos_sin_rutear,pct_productos_sin_entregar,"
            + "pedidos_fuera_de_plazo,productos_fuera_de_plazo,"
            + "min_retraso_promedio,min_retraso_promedio_ponderado_por_productos,"
            + "km_totales,holgura_promedio,colapso,dia_primer_colapso,"
            + "fitness_acumulado,tiempo_computo_ms";

    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MARGEN_CIERRE = 3000;
    private static final int SA_MINUTOS = 30;
    private static final int DIAS_POR_DEFECTO = 7;
    private static final int REPETICIONES_POR_DEFECTO = 5;
    private static final int ESCENARIOS_CALIBRACION = 10;
    private static final long PRESUPUESTO_POR_DEFECTO = 3550;
    private static final int PORCENTAJE = 100;

    /** Multiplicador para que cada escenario reciba semillas propias. */
    private static final long SALTO_SEMILLA_ESCENARIO = 1000L;

    /** Formato de las fechas de las ventanas semanales. */
    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    /** Nombres de los cuatro pesos que se barren en la etapa 1. */
    public static final String SIN_RUTEAR_BASE = "SIN_RUTEAR_BASE";
    public static final String TARDANZA_BASE = "TARDANZA_BASE";
    public static final String POR_MINUTO_TARDE = "POR_MINUTO_TARDE";
    public static final String HOLGURA_BLANDA = "HOLGURA_BLANDA";

    /** Nombres de los parametros del GA que se barren en la etapa 2. */
    public static final String GA_POBLACION = "GA_POBLACION";
    public static final String GA_CRUCE = "GA_CRUCE";
    public static final String GA_MUTACION = "GA_MUTACION";
    public static final String GA_TORNEO = "GA_TORNEO";
    public static final String GA_ELITISMO = "GA_ELITISMO";

    /**
     * @param nombre nombre del factor barrido
     * @return verdadero si el factor es un parametro del algoritmo y no un peso
     */
    private static boolean esParametroGA(String nombre) {
        return nombre.startsWith("GA_");
    }

    /**
     * Aplica un valor al parametro del GA indicado. A diferencia de los pesos,
     * estos no cambian la escala del fitness, de modo que en la etapa 2 el
     * fitness si es comparable entre valores.
     *
     * @param parametros parametros base
     * @param nombre     nombre del parametro a mover
     * @param valor      valor a aplicar
     * @return parametros con el factor indicado en el valor dado
     */
    private static ParametrosGA aplicarParametro(ParametrosGA parametros, String nombre, double valor) {
        return switch (nombre) {
            case GA_POBLACION -> parametros.conTamanoPoblacion((int) Math.round(valor));
            case GA_CRUCE -> parametros.conProbabilidadCruce(valor);
            case GA_MUTACION -> parametros.conProbabilidadMutacion(valor);
            case GA_TORNEO -> parametros.conTamanoTorneo((int) Math.round(valor));
            case GA_ELITISMO -> parametros.conFraccionElite(valor);
            default -> throw new IllegalArgumentException("Parametro desconocido: " + nombre);
        };
    }

    /**
     * Aplica un valor al peso indicado. El umbral de holgura y el peso de
     * espera no se barren: el primero es definicion de negocio y el segundo ya
     * esta fijado.
     *
     * @param pesos  pesos base
     * @param nombre nombre del peso a mover
     * @param valor  valor a aplicar
     * @return pesos con el peso indicado en el valor dado
     */
    private static PesosFitness aplicar(PesosFitness pesos, String nombre, double valor) {
        return switch (nombre) {
            case SIN_RUTEAR_BASE -> pesos.conPenalizacionSinRutearBase(valor);
            case TARDANZA_BASE -> pesos.conPenalizacionTardanzaBase(valor);
            case POR_MINUTO_TARDE -> pesos.conPenalizacionPorMinutoTarde(valor);
            case HOLGURA_BLANDA -> pesos.conFactorHolguraBlanda(valor);
            default -> throw new IllegalArgumentException("Peso desconocido: " + nombre);
        };
    }

    public static void main(String[] args) throws IOException {
        Opciones opciones = Opciones.leer(args);
        List<String> filas = new ArrayList<>();
        Map<Double, List<double[]>> porValor = new LinkedHashMap<>();

        for (double valor : opciones.valores) {
            boolean deAlgoritmo = esParametroGA(opciones.peso);
            PesosFitness pesos = deAlgoritmo
                    ? opciones.pesoBase : aplicar(opciones.pesoBase, opciones.peso, valor);
            ParametrosGA parametros = deAlgoritmo
                    ? aplicarParametro(opciones.parametrosBase, opciones.peso, valor)
                    : opciones.parametrosBase;
            verificarInvariantes(pesos, opciones.peso, valor);
            List<double[]> metricas = new ArrayList<>();
            for (int escenario = 0; escenario < opciones.escenarios().size(); escenario++) {
                for (int repeticion = 1; repeticion <= opciones.repeticiones; repeticion++) {
                    double[] fila = correr(opciones, pesos, parametros, escenario, repeticion,
                            valor, filas);
                    metricas.add(fila);
                }
            }
            porValor.put(valor, metricas);
            System.out.printf(Locale.ROOT, "  %s = %s : %d corridas listas%n",
                    opciones.peso, formatear(valor), metricas.size());
        }

        escribir(Path.of(opciones.salida), filas);
        informarResumen(opciones, porValor);
    }

    /**
     * Escribe el registro completo del barrido, con su cabecera propia. No usa
     * {@link RegistroCsv} porque aquel fija la cabecera de las corridas de
     * comparacion, que registra el fitness y aqui no corresponde.
     *
     * @param archivo archivo de salida
     * @param filas   filas del registro
     * @throws IOException si falla la escritura
     */
    private static void escribir(Path archivo, List<String> filas) throws IOException {
        if (archivo.getParent() != null) {
            Files.createDirectories(archivo.getParent());
        }
        // Se agrega bajo bloqueo exclusivo: varios procesos pueden barrer valores
        // distintos en paralelo contra el mismo CSV sin pisarse.
        try (FileChannel canal = FileChannel.open(archivo, StandardOpenOption.CREATE,
                StandardOpenOption.WRITE, StandardOpenOption.READ);
             FileLock bloqueo = canal.lock()) {
            StringBuilder texto = new StringBuilder();
            if (canal.size() == 0) {
                texto.append(CABECERA).append(System.lineSeparator());
            }
            for (String fila : filas) {
                texto.append(fila).append(System.lineSeparator());
            }
            canal.position(canal.size());
            canal.write(ByteBuffer.wrap(texto.toString().getBytes(StandardCharsets.UTF_8)));
            canal.force(true);
        }
        System.out.printf("%nRegistro: %s (%d filas agregadas)%n", archivo, filas.size());
    }

    /**
     * Corre una simulacion y agrega su fila al registro.
     *
     * @param opciones   opciones del barrido
     * @param pesos      pesos de esta combinacion
     * @param escenario  numero de escenario de calibracion
     * @param repeticion numero de repeticion
     * @param valor      valor del peso barrido
     * @param filas      registro al que se agrega la fila
     * @return metricas de la corrida, en el orden de la cabecera
     * @throws IOException si falla la lectura del escenario
     */
    private static double[] correr(Opciones opciones, PesosFitness pesos, ParametrosGA parametros,
                                   int escenario, int repeticion, double valor, List<String> filas)
            throws IOException {
        String nombre = opciones.escenarios().get(escenario);
        long semilla = (escenario + 1) * SALTO_SEMILLA_ESCENARIO + repeticion;
        List<Pedido> pedidos = opciones.cargarPedidos(nombre);
        ResultadoSimulacion resultado = simular(opciones, pesos, parametros, nombre, semilla, pedidos);

        long productosTotales = 0;
        for (Pedido pedido : pedidos) {
            productosTotales += pedido.getCantidad();
        }
        double pctPedidosSinRutear = pedidos.isEmpty() ? 0.0
                : PORCENTAJE * (1.0 - (double) resultado.getTotalEntregas() / pedidos.size());
        double pctProductosSinEntregar = productosTotales == 0 ? 0.0
                : PORCENTAJE * (1.0 - (double) resultado.getProductosEntregados() / productosTotales);

        int instanteColapso = resultado.getInstanteColapso();
        double[] metricas = {
                Math.max(0.0, pctPedidosSinRutear),
                Math.max(0.0, pctProductosSinEntregar),
                resultado.getTotalIncumplimientos(),
                resultado.getProductosFueraDePlazo(),
                resultado.getRetrasoPromedioMinutos(),
                resultado.getRetrasoPromedioPonderadoMinutos(),
                resultado.getDistanciaTotal(),
                resultado.getHolguraPromedioMinutos()
        };
        filas.add(String.format(Locale.ROOT,
                "%s,%s,%s,%d,%d,%.4f,%.4f,%.0f,%.0f,%.4f,%.4f,%.0f,%.4f,%d,%s,%.2f,%d",
                nombre, opciones.peso, formatear(valor), repeticion, semilla,
                metricas[0], metricas[1], metricas[2], metricas[3], metricas[4],
                metricas[5], metricas[6], metricas[7],
                instanteColapso >= 0 ? 1 : 0,
                instanteColapso >= 0 ? String.valueOf(instanteColapso / MINUTOS_POR_DIA + 1) : "",
                resultado.getFitnessAcumulado(), resultado.getTiempoComputoTotalMs()));
        // Progreso por corrida: sin esto, un barrido largo no muestra nada hasta
        // cerrar el grupo completo de repeticiones y no se sabe donde va.
        System.out.printf(Locale.ROOT,
                "    %s rep %d: productos sin entregar %.2f%%, pedidos sin rutear %.2f%%, "
                        + "productos fuera de plazo %.0f, colapso %s%n",
                nombre, repeticion, metricas[1], metricas[0], metricas[3],
                instanteColapso >= 0 ? "dia " + (instanteColapso / MINUTOS_POR_DIA + 1) : "no");
        return metricas;
    }

    /**
     * Arma y corre la simulacion de una corrida con el GA.
     *
     * @param opciones opciones del barrido
     * @param pesos    pesos de la funcion objetivo
     * @param nombre   nombre del escenario
     * @param semilla  semilla de la corrida
     * @return resultado agregado de la simulacion
     * @throws IOException si falla la lectura del escenario
     */
    private static ResultadoSimulacion simular(Opciones opciones, PesosFitness pesos,
                                               ParametrosGA parametros, String nombre,
                                               long semilla, List<Pedido> pedidos) throws IOException {
        ContadorEvaluaciones contador = new ContadorEvaluaciones(opciones.presupuesto);

        int horizonte = opciones.dias * MINUTOS_POR_DIA;
        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(almacenes.get(0));
        Malla malla = new Malla(opciones.cargarBloqueos(nombre));

        Orquestador orquestador = new Orquestador(almacenes, flota, pedidos, List.of(), malla, SA_MINUTOS,
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS, 0, semilla,
                unaSemilla -> new PlanificadorGA(unaSemilla, parametros, pesos, contador));
        return orquestador.simular(horizonte + MARGEN_CIERRE, false);
    }

    /**
     * Corta el barrido si una combinacion viola las invariantes de la funcion
     * objetivo: seguir gastando computo en pesos inutilizables no tiene sentido.
     *
     * @param pesos pesos a verificar
     * @param peso  nombre del peso barrido
     * @param valor valor del peso barrido
     */
    private static void verificarInvariantes(PesosFitness pesos, String peso, double valor) {
        for (VerificadorInvariantes.Resultado resultado : VerificadorInvariantes.verificar(pesos)) {
            if (!resultado.esOk()) {
                throw new IllegalStateException(String.format(Locale.ROOT,
                        "%s = %s viola la invariante %s: %s", peso, formatear(valor),
                        resultado.getInvariante(), resultado.getDetalle()));
            }
        }
    }

    /**
     * Imprime la media de cada metrica por valor del peso, que es el resumen
     * sobre el que se busca el codo.
     *
     * @param opciones opciones del barrido
     * @param porValor metricas de cada valor del peso
     */
    private static void informarResumen(Opciones opciones, Map<Double, List<double[]>> porValor) {
        System.out.println();
        System.out.printf("Resumen del barrido de %s (media de %d corridas por valor)%n",
                opciones.peso, opciones.escenarios().size() * opciones.repeticiones);
        System.out.printf("%12s %14s %16s %16s %16s %14s %16s %12s %12s%n", "valor",
                "pct_pedidos", "pct_productos", "pedidos_tarde", "productos_tarde",
                "retraso_prom", "retraso_pond", "km_totales", "holgura");
        for (Map.Entry<Double, List<double[]>> entrada : porValor.entrySet()) {
            double[] medias = new double[8];
            for (double[] fila : entrada.getValue()) {
                for (int i = 0; i < medias.length; i++) {
                    medias[i] += fila[i] / entrada.getValue().size();
                }
            }
            System.out.printf(Locale.ROOT,
                    "%12s %14.4f %16.4f %16.1f %16.1f %14.2f %16.2f %12.0f %12.2f%n",
                    formatear(entrada.getKey()), medias[0], medias[1], medias[2], medias[3],
                    medias[4], medias[5], medias[6], medias[7]);
        }
    }

    /**
     * @param valor valor a formatear
     * @return el valor sin decimales si es entero, para que el CSV sea legible
     */
    private static String formatear(double valor) {
        return valor == Math.rint(valor) && !Double.isInfinite(valor)
                ? String.format(Locale.ROOT, "%.0f", valor)
                : String.valueOf(valor);
    }

    /** Opciones del barrido. */
    private static final class Opciones {
        private String peso = SIN_RUTEAR_BASE;
        private double[] valores = {1000, 2500, 5000, 10000, 20000};
        private PesosFitness pesoBase = PesosFitness.porDefecto();
        private ParametrosGA parametrosBase = ParametrosGA.porDefecto();
        private String carpeta = "datos/experimento";
        private int dias = DIAS_POR_DEFECTO;
        private int repeticiones = REPETICIONES_POR_DEFECTO;
        private long presupuesto = PRESUPUESTO_POR_DEFECTO;
        private String salida = "resultados/calibracion.csv";
        private String ventas;
        private String bloqueos;
        private List<String> meses = new ArrayList<>();
        private List<String> escenariosExplicitos = new ArrayList<>();
        private List<String> ventanas = new ArrayList<>();

        /**
         * Construye el rango de una ventana semanal a partir de su fecha de
         * inicio. La ventana dura los mismos dias que simula la corrida.
         *
         * @param inicio fecha de inicio en formato dd-MM-yyyy
         * @return rango de fechas de la ventana
         */
        private RangoFechas rangoDe(String inicio) {
            LocalDate desde = LocalDate.parse(inicio, FORMATO_FECHA);
            LocalDate hasta = desde.plusDays(dias - 1L);
            return RangoFechas.parsear(inicio, hasta.format(FORMATO_FECHA));
        }

        /**
         * @return nombres de los escenarios del barrido: los indicados a mano,
         *         los meses del dataset real, o el banco sintetico por defecto
         */
        private List<String> escenarios() {
            if (!ventanas.isEmpty()) {
                return ventanas;
            }
            if (!escenariosExplicitos.isEmpty()) {
                return escenariosExplicitos;
            }
            if (!meses.isEmpty()) {
                return meses;
            }
            List<String> nombres = new ArrayList<>();
            for (int i = 1; i <= ESCENARIOS_CALIBRACION; i++) {
                nombres.add(String.format(Locale.ROOT, "esc-c%02d", i));
            }
            return nombres;
        }

        /**
         * @param nombre escenario o mes a cargar
         * @return pedidos del horizonte
         * @throws IOException si falla la lectura
         */
        private List<Pedido> cargarPedidos(String nombre) throws IOException {
            int horizonte = dias * MINUTOS_POR_DIA;
            if (!ventanas.isEmpty()) {
                return CargadorPedidos.cargarEnRango(ventas, rangoDe(nombre));
            }
            if (!meses.isEmpty()) {
                return CargadorPedidos.cargar(ventas, horizonte, nombre);
            }
            return CargadorPedidos.cargar(
                    GeneradorEscenarios.rutaVentas(Path.of(carpeta), nombre).toString(), horizonte);
        }

        /**
         * @param nombre escenario o mes a cargar
         * @return bloqueos vigentes del escenario
         * @throws IOException si falla la lectura
         */
        private List<Bloqueo> cargarBloqueos(String nombre) throws IOException {
            if (!ventanas.isEmpty()) {
                return bloqueos == null ? List.of()
                        : CargadorBloqueos.cargarEnRango(bloqueos, rangoDe(nombre));
            }
            if (!meses.isEmpty()) {
                return bloqueos == null ? List.of() : CargadorBloqueos.cargar(bloqueos, nombre);
            }
            return CargadorBloqueos.cargar(
                    GeneradorEscenarios.rutaBloqueos(Path.of(carpeta), nombre).toString());
        }

        private static Opciones leer(String[] args) {
            Opciones opciones = new Opciones();
            for (int i = 0; i + 1 < args.length; i += 2) {
                String valor = args[i + 1];
                switch (args[i]) {
                    case "--peso" -> opciones.peso = valor;
                    case "--valores" -> opciones.valores = parsearValores(valor);
                    case "--carpeta" -> opciones.carpeta = valor;
                    case "--dias" -> opciones.dias = Integer.parseInt(valor);
                    case "--repeticiones" -> opciones.repeticiones = Integer.parseInt(valor);
                    case "--presupuesto-evaluaciones" -> opciones.presupuesto = Long.parseLong(valor);
                    case "--salida" -> opciones.salida = valor;
                    case "--ventas" -> opciones.ventas = valor;
                    case "--bloqueos" -> opciones.bloqueos = valor;
                    case "--meses" -> opciones.meses = List.of(valor.split(","));
                    case "--escenarios" -> opciones.escenariosExplicitos = List.of(valor.split(","));
                    case "--ventanas" -> opciones.ventanas = List.of(valor.split(","));
                    case "--fijar-sin-rutear" -> opciones.pesoBase =
                            opciones.pesoBase.conPenalizacionSinRutearBase(Double.parseDouble(valor));
                    case "--fijar-tardanza-base" -> opciones.pesoBase =
                            opciones.pesoBase.conPenalizacionTardanzaBase(Double.parseDouble(valor));
                    case "--fijar-minuto-tarde" -> opciones.pesoBase =
                            opciones.pesoBase.conPenalizacionPorMinutoTarde(Double.parseDouble(valor));
                    case "--fijar-holgura-blanda" -> opciones.pesoBase =
                            opciones.pesoBase.conFactorHolguraBlanda(Double.parseDouble(valor));
                    case "--fijar-peso-espera" -> opciones.pesoBase =
                            opciones.pesoBase.conPesoEspera(Double.parseDouble(valor));
                    case "--fijar-ga-poblacion" -> opciones.parametrosBase =
                            opciones.parametrosBase.conTamanoPoblacion(Integer.parseInt(valor));
                    case "--fijar-ga-cruce" -> opciones.parametrosBase =
                            opciones.parametrosBase.conProbabilidadCruce(Double.parseDouble(valor));
                    case "--fijar-ga-mutacion" -> opciones.parametrosBase =
                            opciones.parametrosBase.conProbabilidadMutacion(Double.parseDouble(valor));
                    case "--fijar-ga-torneo" -> opciones.parametrosBase =
                            opciones.parametrosBase.conTamanoTorneo(Integer.parseInt(valor));
                    case "--fijar-ga-elitismo" -> opciones.parametrosBase =
                            opciones.parametrosBase.conFraccionElite(Double.parseDouble(valor));
                    default -> throw new IllegalArgumentException("Opcion desconocida: " + args[i]);
                }
            }
            return opciones;
        }

        private static double[] parsearValores(String texto) {
            String[] partes = texto.split(",");
            double[] valores = new double[partes.length];
            for (int i = 0; i < partes.length; i++) {
                valores[i] = Double.parseDouble(partes[i].trim());
            }
            return valores;
        }
    }

    private BarridoCalibracion() {
    }
}
