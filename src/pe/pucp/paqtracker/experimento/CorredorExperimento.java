package pe.pucp.paqtracker.experimento;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.AlgoritmoMetaheuristico;
import pe.pucp.paqtracker.planificador.MemoriaFeromonas;
import pe.pucp.paqtracker.planificador.ParametrosGA;
import pe.pucp.paqtracker.planificador.ParametrosIACO;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.planificador.PlanificadorIACO;
import pe.pucp.paqtracker.planificador.comun.ContadorEvaluaciones;
import pe.pucp.paqtracker.planificador.comun.PesosFitness;
import pe.pucp.paqtracker.repositorio.CargadorBloqueos;
import pe.pucp.paqtracker.repositorio.CargadorPedidos;
import pe.pucp.paqtracker.servicio.ObservadorSimulacion;
import pe.pucp.paqtracker.servicio.Orquestador;
import pe.pucp.paqtracker.servicio.ResultadoSimulacion;
import pe.pucp.paqtracker.util.Malla;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.LongFunction;

/**
 * Entrada unica del experimento numerico: una corrida por invocacion.
 *
 * Ejecuta un escenario del banco con un algoritmo, una semilla y un
 * presupuesto de computo medido en evaluaciones de la funcion objetivo, y emite
 * una fila de registro por cada corte de medicion. Todo lo que el protocolo
 * permite variar (pesos de la funcion objetivo y parametros de cada algoritmo)
 * se pasa por linea de comandos, de modo que la calibracion no exija recompilar.
 *
 * La simulacion nunca se detiene por colapso logistico: continua hasta el
 * ultimo dia para poder medir los tres horizontes, y el instante del primer
 * colapso queda registrado en su propia columna.
 *
 * Uso:
 *   java pe.pucp.paqtracker.experimento.CorredorExperimento \
 *        --escenario esc-01 --algoritmo GA --semilla 1 --dias 30 \
 *        --presupuesto-evaluaciones 3550 --salida resultados/corridas.csv
 */
public final class CorredorExperimento {

    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MARGEN_CIERRE = 3000;
    private static final int SA_MINUTOS_POR_DEFECTO = 30;
    private static final String SALIDA_POR_DEFECTO = "resultados/corridas.csv";
    private static final int[] CORTES_POR_DEFECTO = {1, 7, 30};

    /**
     * Ejecuta una corrida del experimento.
     *
     * @param args opciones de la corrida
     * @throws IOException si falla la lectura del escenario o la escritura del registro
     */
    public static void main(String[] args) throws IOException {
        Opciones opciones = Opciones.leer(args);
        List<String> filas = ejecutar(opciones);
        new RegistroCsv(Path.of(opciones.salida)).agregar(filas);
        System.out.println(RegistroCsv.CABECERA);
        filas.forEach(System.out::println);
    }

    /**
     * Corre una simulacion completa y devuelve una fila de registro por corte.
     *
     * @param opciones opciones de la corrida
     * @return filas del registro, una por corte de medicion
     * @throws IOException si falla la lectura de los archivos del escenario
     */
    public static List<String> ejecutar(Opciones opciones) throws IOException {
        verificarDespachoDirecto();
        ContadorEvaluaciones.reiniciarTodo();
        if (opciones.presupuestoEvaluaciones > 0) {
            ContadorEvaluaciones.fijarPresupuestoPorCiclo(opciones.presupuestoEvaluaciones);
        }

        Path carpeta = Path.of(opciones.carpeta);
        int horizonte = opciones.dias * MINUTOS_POR_DIA;
        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(almacenes.get(0));
        List<Pedido> pedidos = CargadorPedidos.cargar(
                GeneradorEscenarios.rutaVentas(carpeta, opciones.escenario).toString(), horizonte);
        Malla malla = new Malla(CargadorBloqueos.cargar(
                GeneradorEscenarios.rutaBloqueos(carpeta, opciones.escenario).toString()));

        Orquestador orquestador = new Orquestador(almacenes, flota, pedidos, malla,
                opciones.saMinutos, ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS, 0,
                opciones.semilla, fabricaAlgoritmo(opciones));

        Map<Integer, Corte> cortes = new LinkedHashMap<>();
        orquestador.fijarObservador(recolector(opciones.cortes, cortes));
        orquestador.simular(horizonte + MARGEN_CIERRE, false);

        return formatear(opciones, cortes, pedidos.size());
    }

    /**
     * Construye el observador que toma una instantanea del estado acumulado en
     * cada dia de corte. Es el punto que permite medir los tres horizontes como
     * cortes de una misma simulacion y no como corridas independientes.
     *
     * @param diasDeCorte dias en que se toma la instantanea
     * @param destino     mapa donde se acumulan los cortes tomados
     * @return observador listo para instalar en el orquestador
     */
    private static ObservadorSimulacion recolector(int[] diasDeCorte, Map<Integer, Corte> destino) {
        return (dia, parcial, entregasEnCola) -> {
            for (int corte : diasDeCorte) {
                if (corte == dia) {
                    destino.put(dia, Corte.tomar(parcial, entregasEnCola));
                }
            }
        };
    }

    /**
     * Fabrica el algoritmo de la corrida con los parametros y pesos indicados.
     * El IACO recibe una sola memoria de feromonas para toda la simulacion, de
     * modo que el aprendizaje persista entre ciclos como en produccion.
     *
     * @param opciones opciones de la corrida
     * @return fabrica que crea el algoritmo de cada ciclo a partir de su semilla
     */
    private static LongFunction<AlgoritmoMetaheuristico> fabricaAlgoritmo(Opciones opciones) {
        if ("GA".equals(opciones.algoritmo)) {
            ParametrosGA parametros = opciones.parametrosGA;
            PesosFitness pesos = opciones.pesos;
            return semilla -> new PlanificadorGA(semilla, parametros, pesos);
        }
        ParametrosIACO parametros = opciones.parametrosIACO;
        PesosFitness pesos = opciones.pesos;
        MemoriaFeromonas memoria = PlanificadorIACO.crearMemoria(parametros);
        return semilla -> new PlanificadorIACO(semilla, memoria, parametros, pesos);
    }

    /**
     * Comprueba el supuesto 4 del diseño: con el plazo de despacho directo en
     * cero ningun pedido se desvia y los dos algoritmos procesan el 100 % del
     * trafico. El orquestador de la corrida recibe cero de forma explicita; esta
     * verificacion avisa si la constante del dominio dejo de acompañarlo.
     */
    private static void verificarDespachoDirecto() {
        if (ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS != 0) {
            System.err.println("Aviso: PLAZO_DESPACHO_DIRECTO_MINUTOS vale "
                    + ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS
                    + " en ConfiguracionDominio; la corrida lo fuerza a 0 igualmente.");
        }
    }

    /**
     * Formatea las filas del registro, una por corte pedido.
     *
     * @param opciones      opciones de la corrida
     * @param cortes        instantaneas tomadas por el observador
     * @param pedidosTotales pedidos del escenario dentro del horizonte
     * @return filas del registro
     */
    private static List<String> formatear(Opciones opciones, Map<Integer, Corte> cortes,
                                          int pedidosTotales) {
        List<String> filas = new ArrayList<>();
        for (int dia : opciones.cortes) {
            Corte corte = cortes.get(dia);
            if (corte == null) {
                continue;
            }
            filas.add(String.format("%s,%s,%d,%d,%d,%.4f,%.0f,%d,%d,%d,%d,%d,%s,%d,%d",
                    opciones.escenario, opciones.algoritmo, opciones.repeticion, opciones.semilla,
                    dia, corte.fitnessAcumulado, corte.distanciaTotal, corte.entregasFueraPlazo,
                    corte.entregasEnCola, corte.colapso, corte.evaluaciones, corte.tiempoMs,
                    corte.diaPrimerColapso < 0 ? "" : String.valueOf(corte.diaPrimerColapso),
                    pedidosTotales, corte.entregasRealizadas));
        }
        return filas;
    }

    /** Instantanea del estado acumulado en un dia de corte. */
    private static final class Corte {
        private final double fitnessAcumulado;
        private final double distanciaTotal;
        private final int entregasFueraPlazo;
        private final int entregasEnCola;
        private final int colapso;
        private final int diaPrimerColapso;
        private final long evaluaciones;
        private final long tiempoMs;
        private final int entregasRealizadas;

        private Corte(double fitnessAcumulado, double distanciaTotal, int entregasFueraPlazo,
                      int entregasEnCola, int colapso, int diaPrimerColapso, long evaluaciones,
                      long tiempoMs, int entregasRealizadas) {
            this.fitnessAcumulado = fitnessAcumulado;
            this.distanciaTotal = distanciaTotal;
            this.entregasFueraPlazo = entregasFueraPlazo;
            this.entregasEnCola = entregasEnCola;
            this.colapso = colapso;
            this.diaPrimerColapso = diaPrimerColapso;
            this.evaluaciones = evaluaciones;
            this.tiempoMs = tiempoMs;
            this.entregasRealizadas = entregasRealizadas;
        }

        /**
         * @param parcial        resultado acumulado en el instante del corte
         * @param entregasEnCola pedidos ingresados y aun no despachados
         * @return instantanea inmutable del corte
         */
        private static Corte tomar(ResultadoSimulacion parcial, int entregasEnCola) {
            int instanteColapso = parcial.getInstanteColapso();
            return new Corte(parcial.getFitnessAcumulado(), parcial.getDistanciaTotal(),
                    parcial.getTotalIncumplimientos(), entregasEnCola,
                    instanteColapso >= 0 ? 1 : 0,
                    instanteColapso >= 0 ? instanteColapso / MINUTOS_POR_DIA + 1 : -1,
                    ContadorEvaluaciones.getTotal(), parcial.getTiempoComputoTotalMs(),
                    parcial.getTotalEntregas());
        }
    }

    /** Opciones de una corrida, leidas de la linea de comandos. */
    public static final class Opciones {
        private String escenario = "esc-01";
        private String carpeta = GeneradorEscenarios.CARPETA_POR_DEFECTO;
        private String algoritmo = "GA";
        private long semilla = 1L;
        private int repeticion = 1;
        private int dias = GeneradorEscenarios.DIAS;
        private int saMinutos = SA_MINUTOS_POR_DEFECTO;
        private long presupuestoEvaluaciones = 0L;
        private int[] cortes = CORTES_POR_DEFECTO;
        private String salida = SALIDA_POR_DEFECTO;
        private PesosFitness pesos = PesosFitness.porDefecto();
        private ParametrosGA parametrosGA = ParametrosGA.porDefecto();
        private ParametrosIACO parametrosIACO = ParametrosIACO.porDefecto();

        /**
         * Lee las opciones de la linea de comandos.
         *
         * @param args argumentos de la invocacion
         * @return opciones de la corrida
         * @throws IllegalArgumentException si una opcion es desconocida o le falta el valor
         */
        public static Opciones leer(String[] args) {
            Opciones opciones = new Opciones();
            for (int i = 0; i < args.length; i++) {
                String nombre = args[i];
                if (!nombre.startsWith("--")) {
                    throw new IllegalArgumentException("Opcion desconocida: " + nombre);
                }
                if (i + 1 >= args.length) {
                    throw new IllegalArgumentException("Falta el valor de " + nombre);
                }
                opciones.aplicar(nombre, args[++i]);
            }
            return opciones;
        }

        /**
         * Aplica una opcion leida.
         *
         * @param nombre nombre de la opcion, con los dos guiones
         * @param valor  valor de la opcion
         */
        private void aplicar(String nombre, String valor) {
            switch (nombre) {
                case "--escenario" -> escenario = valor;
                case "--carpeta" -> carpeta = valor;
                case "--algoritmo" -> algoritmo = normalizarAlgoritmo(valor);
                case "--semilla" -> semilla = Long.parseLong(valor);
                case "--repeticion" -> repeticion = Integer.parseInt(valor);
                case "--dias" -> dias = Integer.parseInt(valor);
                case "--sa-minutos" -> saMinutos = Integer.parseInt(valor);
                case "--presupuesto-evaluaciones" -> presupuestoEvaluaciones = Long.parseLong(valor);
                case "--cortes" -> cortes = parsearCortes(valor);
                case "--salida" -> salida = valor;
                case "--peso-umbral-holgura" ->
                        pesos = pesos.conUmbralHolgura(Integer.parseInt(valor));
                case "--peso-factor-blanda" ->
                        pesos = pesos.conFactorHolguraBlanda(Double.parseDouble(valor));
                case "--peso-tardanza-base" ->
                        pesos = pesos.conPenalizacionTardanzaBase(Double.parseDouble(valor));
                case "--peso-minuto-tarde" ->
                        pesos = pesos.conPenalizacionPorMinutoTarde(Double.parseDouble(valor));
                case "--peso-sin-rutear" ->
                        pesos = pesos.conPenalizacionSinRutearBase(Double.parseDouble(valor));
                case "--peso-espera" -> pesos = pesos.conPesoEspera(Double.parseDouble(valor));
                case "--ga-poblacion" ->
                        parametrosGA = parametrosGA.conTamanoPoblacion(Integer.parseInt(valor));
                case "--ga-generaciones" ->
                        parametrosGA = parametrosGA.conMaxGeneraciones(Integer.parseInt(valor));
                case "--ga-cruce" ->
                        parametrosGA = parametrosGA.conProbabilidadCruce(Double.parseDouble(valor));
                case "--ga-mutacion" ->
                        parametrosGA = parametrosGA.conProbabilidadMutacion(Double.parseDouble(valor));
                case "--ga-elite" ->
                        parametrosGA = parametrosGA.conFraccionElite(Double.parseDouble(valor));
                case "--ga-golosa" ->
                        parametrosGA = parametrosGA.conFraccionGolosa(Double.parseDouble(valor));
                case "--ga-torneo" ->
                        parametrosGA = parametrosGA.conTamanoTorneo(Integer.parseInt(valor));
                case "--iaco-hormigas" ->
                        parametrosIACO = parametrosIACO.conHormigas(Integer.parseInt(valor));
                case "--iaco-iteraciones" ->
                        parametrosIACO = parametrosIACO.conIteraciones(Integer.parseInt(valor));
                case "--iaco-alfa" ->
                        parametrosIACO = parametrosIACO.conAlfa(Double.parseDouble(valor));
                case "--iaco-beta" ->
                        parametrosIACO = parametrosIACO.conBeta(Double.parseDouble(valor));
                case "--iaco-gamma" ->
                        parametrosIACO = parametrosIACO.conGamma(Double.parseDouble(valor));
                case "--iaco-rho" ->
                        parametrosIACO = parametrosIACO.conRho(Double.parseDouble(valor));
                case "--iaco-elite" ->
                        parametrosIACO = parametrosIACO.conElite(Integer.parseInt(valor));
                case "--iaco-tau-min" ->
                        parametrosIACO = parametrosIACO.conTauMin(Double.parseDouble(valor));
                case "--iaco-tau-max" ->
                        parametrosIACO = parametrosIACO.conTauMax(Double.parseDouble(valor));
                case "--iaco-candidatos" ->
                        parametrosIACO = parametrosIACO.conCandidatos(Integer.parseInt(valor));
                case "--iaco-busqueda-local-top" ->
                        parametrosIACO = parametrosIACO.conBusquedaLocalTop(Integer.parseInt(valor));
                case "--iaco-q0" -> parametrosIACO = parametrosIACO.conQ0(Double.parseDouble(valor));
                case "--iaco-xi" ->
                        parametrosIACO = parametrosIACO.conXiLocal(Double.parseDouble(valor));
                case "--iaco-estancamiento" ->
                        parametrosIACO = parametrosIACO.conEstancamiento(Integer.parseInt(valor));
                case "--iaco-parada" ->
                        parametrosIACO = parametrosIACO.conParada(Integer.parseInt(valor));
                case "--iaco-buffer" ->
                        parametrosIACO = parametrosIACO.conBufferMinutos(Integer.parseInt(valor));
                default -> throw new IllegalArgumentException("Opcion desconocida: " + nombre);
            }
        }

        /**
         * @param valor nombre del algoritmo, en cualquier caja
         * @return GA o IACO
         * @throws IllegalArgumentException si el algoritmo no es uno de los dos candidatos
         */
        private static String normalizarAlgoritmo(String valor) {
            String normalizado = valor.trim().toUpperCase();
            if (!"GA".equals(normalizado) && !"IACO".equals(normalizado)) {
                throw new IllegalArgumentException("Algoritmo desconocido: " + valor
                        + " (use GA o IACO)");
            }
            return normalizado;
        }

        /**
         * @param valor dias de corte separados por comas
         * @return dias de corte
         */
        private static int[] parsearCortes(String valor) {
            String[] partes = valor.split(",");
            int[] cortes = new int[partes.length];
            for (int i = 0; i < partes.length; i++) {
                cortes[i] = Integer.parseInt(partes[i].trim());
            }
            return cortes;
        }

        public String getEscenario() {
            return escenario;
        }

        public String getAlgoritmo() {
            return algoritmo;
        }

        public String getSalida() {
            return salida;
        }
    }

    private CorredorExperimento() {
    }
}
