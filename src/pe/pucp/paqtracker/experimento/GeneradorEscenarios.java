package pe.pucp.paqtracker.experimento;

import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Generador del banco de escenarios del experimento numerico.
 *
 * Produce 40 escenarios con identificador estable y disjuntos entre si:
 * esc-c01 a esc-c10 para la calibracion y esc-01 a esc-30 para la comparacion.
 * Cada escenario se persiste como un par de archivos de entrada en el formato
 * que ya leen CargadorPedidos y CargadorBloqueos, de modo que las corridas sean
 * reproducibles y auditables y ambos algoritmos vean exactamente los mismos
 * datos.
 *
 * Los elementos fijos (ciudad de 70x50, almacen central en (27,14),
 * intermedios en (12,38) y (57,27), flota de 37 unidades) no se escriben en el
 * escenario: viven en ConfiguracionDominio y son identicos en toda corrida. Lo
 * unico que varia entre escenarios son los pedidos y los bloqueos de via, tal
 * como exige el alcance del diseño: no hay averias ni mantenimiento.
 *
 * La generacion es determinista: cada escenario deriva de una semilla propia,
 * calculada como semillaBase * 1000 + indice global, y el manifiesto deja por
 * escrito el mapeo escenario - semilla para poder regenerar el mismo banco.
 */
public final class GeneradorEscenarios {

    /** Carpeta de salida por defecto del banco de escenarios. */
    public static final String CARPETA_POR_DEFECTO = "datos/experimento";

    /** Semilla base por defecto del banco (fecha de cierre del diseño). */
    public static final long SEMILLA_BASE_POR_DEFECTO = 20260923L;

    /** Escenarios de calibracion, disjuntos de los de comparacion. */
    public static final int ESCENARIOS_CALIBRACION = 10;

    /** Escenarios de comparacion. */
    public static final int ESCENARIOS_COMPARACION = 30;

    /** Escenarios de comparacion que incorporan bloqueos de via. */
    public static final int ESCENARIOS_CON_BLOQUEOS = 15;

    /** Dias simulados por escenario. */
    public static final int DIAS = 30;

    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MINUTOS_POR_HORA = 60;

    /** Indice global desde el que numeran los escenarios de comparacion. */
    private static final int BASE_INDICE_COMPARACION = 100;

    /** Pedidos por dia de cada estrato de volumen. */
    private static final int[] PEDIDOS_POR_DIA = {15, 21, 30};
    private static final String[] ESTRATOS_VOLUMEN = {"bajo", "medio", "alto"};

    /** Dispersion geografica de los destinos. */
    private static final String[] DISPERSIONES = {"concentrada", "uniforme", "mixta"};

    /** Mezclas de plazos: proporciones acumuladas de las ventanas de 4, 8, 12 y 24 h. */
    private static final String[] MEZCLAS_PLAZO = {"urgente", "equilibrada", "holgada"};
    private static final int[] PLAZOS_HORAS = {4, 8, 12, 24};
    private static final double[][] PROPORCIONES_PLAZO = {
            {0.40, 0.70, 0.90, 1.00},
            {0.25, 0.50, 0.75, 1.00},
            {0.10, 0.30, 0.60, 1.00}};

    /** Centros de los nucleos de demanda del patron concentrado. */
    private static final int[][] NUCLEOS = {{20, 12}, {50, 30}, {33, 40}};

    /** Desviacion, en km, de los destinos alrededor de un nucleo. */
    private static final double DISPERSION_NUCLEO = 7.0;

    /** Cantidad minima y maxima de producto por pedido, como en los datos reales. */
    private static final int CANTIDAD_MINIMA = 1;
    private static final int CANTIDAD_MAXIMA = 10;

    /** Ventana horaria en que se concentran los registros de pedidos. */
    private static final int HORA_INICIO_REGISTRO = 6;
    private static final int HORA_FIN_REGISTRO = 22;

    /** Variacion diaria del volumen respecto del estrato, en tanto por uno. */
    private static final double VARIACION_DIARIA = 0.30;

    /** Bloqueos generados por dia en los escenarios que los incorporan. */
    private static final int BLOQUEOS_POR_DIA = 10;

    /** Longitud minima y maxima de un tramo bloqueado, en kilometros. */
    private static final int TRAMO_MINIMO = 3;
    private static final int TRAMO_MAXIMO = 10;

    /** Duracion minima y maxima de un bloqueo, en horas. */
    private static final int DURACION_MINIMA_HORAS = 2;
    private static final int DURACION_MAXIMA_HORAS = 6;

    /** Intentos maximos de sortear un tramo que no toque un almacen. */
    private static final int INTENTOS_TRAMO = 50;

    /**
     * Genera el banco completo de escenarios.
     *
     * @param args --salida carpeta, --semilla-base numero
     * @throws IOException si no se puede escribir la carpeta de salida
     */
    public static void main(String[] args) throws IOException {
        Path salida = Path.of(valorDe(args, "--salida", CARPETA_POR_DEFECTO));
        long semillaBase = Long.parseLong(
                valorDe(args, "--semilla-base", String.valueOf(SEMILLA_BASE_POR_DEFECTO)));

        Files.createDirectories(salida);
        List<String> manifiesto = new ArrayList<>();
        manifiesto.add("escenario,tipo,semilla_generacion,estrato_volumen,dispersion,"
                + "mezcla_plazos,pedidos,con_bloqueos,bloqueos,dias");

        for (int i = 1; i <= ESCENARIOS_CALIBRACION; i++) {
            manifiesto.add(generarEscenario(salida, identificadorCalibracion(i), "calibracion",
                    i, ESCENARIOS_CALIBRACION, semillaBase, i, false));
        }
        for (int i = 1; i <= ESCENARIOS_COMPARACION; i++) {
            manifiesto.add(generarEscenario(salida, identificadorComparacion(i), "comparacion",
                    i, ESCENARIOS_COMPARACION, semillaBase, BASE_INDICE_COMPARACION + i,
                    llevaBloqueos(i)));
        }

        Path rutaManifiesto = salida.resolve("manifiesto.csv");
        Files.write(rutaManifiesto, manifiesto, StandardCharsets.UTF_8);
        System.out.println("Banco generado en " + salida.toAbsolutePath());
        System.out.println("Escenarios: " + (ESCENARIOS_CALIBRACION + ESCENARIOS_COMPARACION)
                + " (" + ESCENARIOS_CALIBRACION + " de calibracion, "
                + ESCENARIOS_COMPARACION + " de comparacion, "
                + ESCENARIOS_CON_BLOQUEOS + " con bloqueos)");
        System.out.println("Manifiesto: " + rutaManifiesto);
    }

    /**
     * @param indice numero de escenario de calibracion, desde 1
     * @return identificador estable esc-cNN
     */
    public static String identificadorCalibracion(int indice) {
        return String.format("esc-c%02d", indice);
    }

    /**
     * @param indice numero de escenario de comparacion, desde 1
     * @return identificador estable esc-NN
     */
    public static String identificadorComparacion(int indice) {
        return String.format("esc-%02d", indice);
    }

    /**
     * Los escenarios de indice par llevan bloqueos, de modo que los 15 que los
     * incorporan queden repartidos entre todos los estratos de volumen,
     * dispersion y mezcla de plazos en vez de agruparse al inicio o al final.
     *
     * @param indice numero de escenario de comparacion, desde 1
     * @return verdadero si el escenario lleva bloqueos de via
     */
    private static boolean llevaBloqueos(int indice) {
        return indice % 2 == 0;
    }

    /**
     * @param carpeta     carpeta del banco
     * @param escenario   identificador del escenario
     * @return ruta del archivo de pedidos del escenario
     */
    public static Path rutaVentas(Path carpeta, String escenario) {
        return carpeta.resolve(escenario + ".ventas.txt");
    }

    /**
     * @param carpeta   carpeta del banco
     * @param escenario identificador del escenario
     * @return ruta del archivo de bloqueos del escenario
     */
    public static Path rutaBloqueos(Path carpeta, String escenario) {
        return carpeta.resolve(escenario + ".bloqueos.txt");
    }

    /**
     * Calcula la semilla de generacion de un escenario. Se documenta aqui y en
     * el manifiesto para poder regenerar el banco identico.
     *
     * @param semillaBase  semilla base del banco
     * @param indiceGlobal indice global del escenario
     * @return semilla de generacion del escenario
     */
    public static long semillaDe(long semillaBase, int indiceGlobal) {
        return semillaBase * 1000L + indiceGlobal;
    }

    /**
     * Genera los dos archivos de un escenario y devuelve su fila de manifiesto.
     *
     * Los estratos se asignan por el indice local dentro del conjunto, no por
     * el global, para que calibracion y comparacion queden cada una repartida
     * entre los tres niveles de volumen, dispersion y mezcla de plazos. El
     * indice global solo determina la semilla, de modo que los dos conjuntos
     * sean disjuntos.
     *
     * @param salida       carpeta de salida
     * @param escenario    identificador del escenario
     * @param tipo         calibracion o comparacion
     * @param indiceLocal  indice dentro del conjunto, desde 1
     * @param totalDelTipo escenarios del conjunto
     * @param semillaBase  semilla base del banco
     * @param indiceGlobal indice global, que determina la semilla
     * @param conBloqueos  verdadero si el escenario incorpora bloqueos de via
     * @return fila del manifiesto
     * @throws IOException si falla la escritura de alguno de los archivos
     */
    private static String generarEscenario(Path salida, String escenario, String tipo,
                                           int indiceLocal, int totalDelTipo, long semillaBase,
                                           int indiceGlobal, boolean conBloqueos) throws IOException {
        long semilla = semillaDe(semillaBase, indiceGlobal);
        int estrato = (indiceLocal - 1) % ESTRATOS_VOLUMEN.length;
        int dispersion = (indiceLocal - 1) * DISPERSIONES.length / totalDelTipo;
        int mezcla = ((indiceLocal - 1) / 2) % MEZCLAS_PLAZO.length;

        List<String> pedidos = generarPedidos(new Random(semilla), estrato, dispersion, mezcla);
        Files.write(rutaVentas(salida, escenario), pedidos, StandardCharsets.UTF_8);

        List<String> bloqueos = conBloqueos
                ? generarBloqueos(new Random(semilla + 1))
                : List.of();
        Files.write(rutaBloqueos(salida, escenario), bloqueos, StandardCharsets.UTF_8);

        return String.format("%s,%s,%d,%s,%s,%s,%d,%s,%d,%d", escenario, tipo, semilla,
                ESTRATOS_VOLUMEN[estrato], DISPERSIONES[dispersion], MEZCLAS_PLAZO[mezcla],
                pedidos.size(), conBloqueos, bloqueos.size(), DIAS);
    }

    /**
     * Genera los pedidos de los 30 dias del escenario, en el formato
     * ddDhhHmmM:x,y,cliente,cantidad,plazoHoras que lee CargadorPedidos.
     *
     * @param random     generador del escenario
     * @param estrato    estrato de volumen
     * @param dispersion patron de dispersion geografica
     * @param mezcla     mezcla de plazos
     * @return lineas del archivo de pedidos, ordenadas por instante de registro
     */
    private static List<String> generarPedidos(Random random, int estrato, int dispersion,
                                               int mezcla) {
        List<String> lineas = new ArrayList<>();
        int base = PEDIDOS_POR_DIA[estrato];
        int cliente = 0;
        for (int dia = 1; dia <= DIAS; dia++) {
            int delDia = (int) Math.round(base * (1.0 + (random.nextDouble() * 2 - 1) * VARIACION_DIARIA));
            List<Integer> minutos = new ArrayList<>();
            for (int i = 0; i < delDia; i++) {
                minutos.add(sortearMinutoDelDia(random));
            }
            minutos.sort(Integer::compareTo);
            for (int minuto : minutos) {
                Nodo destino = sortearDestino(random, dispersion);
                int cantidad = CANTIDAD_MINIMA
                        + random.nextInt(CANTIDAD_MAXIMA - CANTIDAD_MINIMA + 1);
                int plazo = sortearPlazoHoras(random, mezcla);
                lineas.add(String.format("%02dd%02dh%02dm:%d,%d,c%04d,%02d,%02d",
                        dia, minuto / MINUTOS_POR_HORA, minuto % MINUTOS_POR_HORA,
                        destino.getX(), destino.getY(), cliente++, cantidad, plazo));
            }
        }
        return lineas;
    }

    /**
     * Sortea el minuto del dia en que se registra un pedido. La demanda se
     * concentra en la franja de actividad comercial, no se reparte plana sobre
     * las 24 horas.
     *
     * @param random generador del escenario
     * @return minuto del dia, entre 0 y 1439
     */
    private static int sortearMinutoDelDia(Random random) {
        int inicio = HORA_INICIO_REGISTRO * MINUTOS_POR_HORA;
        int ancho = (HORA_FIN_REGISTRO - HORA_INICIO_REGISTRO) * MINUTOS_POR_HORA;
        return inicio + random.nextInt(ancho);
    }

    /**
     * Sortea el destino de un pedido segun el patron de dispersion: concentrada
     * alrededor de tres nucleos de demanda, uniforme en toda la ciudad, o mixta
     * mitad y mitad.
     *
     * @param random     generador del escenario
     * @param dispersion indice del patron de dispersion
     * @return nodo de destino dentro de la malla
     */
    private static Nodo sortearDestino(Random random, int dispersion) {
        boolean concentrado = dispersion == 0 || (dispersion == 2 && random.nextBoolean());
        if (!concentrado) {
            return new Nodo(random.nextInt(ConfiguracionDominio.MALLA_ANCHO + 1),
                    random.nextInt(ConfiguracionDominio.MALLA_ALTO + 1));
        }
        int[] nucleo = NUCLEOS[random.nextInt(NUCLEOS.length)];
        int x = acotar((int) Math.round(nucleo[0] + random.nextGaussian() * DISPERSION_NUCLEO),
                ConfiguracionDominio.MALLA_ANCHO);
        int y = acotar((int) Math.round(nucleo[1] + random.nextGaussian() * DISPERSION_NUCLEO),
                ConfiguracionDominio.MALLA_ALTO);
        return new Nodo(x, y);
    }

    /**
     * Sortea el plazo comprometido de un pedido segun la mezcla del escenario.
     *
     * @param random generador del escenario
     * @param mezcla indice de la mezcla de plazos
     * @return plazo en horas: 4, 8, 12 o 24
     */
    private static int sortearPlazoHoras(Random random, int mezcla) {
        double sorteo = random.nextDouble();
        double[] acumuladas = PROPORCIONES_PLAZO[mezcla];
        for (int i = 0; i < acumuladas.length; i++) {
            if (sorteo < acumuladas[i]) {
                return PLAZOS_HORAS[i];
            }
        }
        return PLAZOS_HORAS[PLAZOS_HORAS.length - 1];
    }

    /**
     * Genera los bloqueos de via del escenario, repartidos a lo largo de los 30
     * dias, en el formato ddDhhHmmM-ddDhhHmmM:x1,y1,x2,y2 que lee
     * CargadorBloqueos. Un tramo bloqueado nunca toca un almacen: dejar un
     * almacen aislado no es un bloqueo de via, es una averia de la red, y las
     * averias estan fuera del alcance del experimento.
     *
     * @param random generador de bloqueos del escenario
     * @return lineas del archivo de bloqueos
     */
    private static List<String> generarBloqueos(Random random) {
        List<String> lineas = new ArrayList<>();
        for (int dia = 1; dia <= DIAS; dia++) {
            for (int i = 0; i < BLOQUEOS_POR_DIA; i++) {
                int[] tramo = sortearTramo(random);
                if (tramo == null) {
                    continue;
                }
                int minutoInicio = random.nextInt(MINUTOS_POR_DIA);
                int duracion = (DURACION_MINIMA_HORAS
                        + random.nextInt(DURACION_MAXIMA_HORAS - DURACION_MINIMA_HORAS + 1))
                        * MINUTOS_POR_HORA;
                int inicio = (dia - 1) * MINUTOS_POR_DIA + minutoInicio;
                lineas.add(String.format("%s-%s:%d,%d,%d,%d",
                        comoMarca(inicio), comoMarca(inicio + duracion),
                        tramo[0], tramo[1], tramo[2], tramo[3]));
            }
        }
        return lineas;
    }

    /**
     * Sortea un tramo horizontal o vertical de la malla que no contenga ningun
     * almacen.
     *
     * @param random generador de bloqueos
     * @return coordenadas x1,y1,x2,y2 del tramo, o null si no se encontro uno valido
     */
    private static int[] sortearTramo(Random random) {
        for (int intento = 0; intento < INTENTOS_TRAMO; intento++) {
            boolean horizontal = random.nextBoolean();
            int largo = TRAMO_MINIMO + random.nextInt(TRAMO_MAXIMO - TRAMO_MINIMO + 1);
            int x1 = random.nextInt(ConfiguracionDominio.MALLA_ANCHO + 1);
            int y1 = random.nextInt(ConfiguracionDominio.MALLA_ALTO + 1);
            int x2 = horizontal ? acotar(x1 + largo, ConfiguracionDominio.MALLA_ANCHO) : x1;
            int y2 = horizontal ? y1 : acotar(y1 + largo, ConfiguracionDominio.MALLA_ALTO);
            if (!tocaAlmacen(x1, y1, x2, y2)) {
                return new int[]{x1, y1, x2, y2};
            }
        }
        return null;
    }

    /**
     * @param x1 coordenada x del primer extremo del tramo
     * @param y1 coordenada y del primer extremo del tramo
     * @param x2 coordenada x del segundo extremo del tramo
     * @param y2 coordenada y del segundo extremo del tramo
     * @return verdadero si el tramo contiene la ubicacion de algun almacen
     */
    private static boolean tocaAlmacen(int x1, int y1, int x2, int y2) {
        for (var almacen : ConfiguracionDominio.crearAlmacenes()) {
            Nodo ubicacion = almacen.getUbicacion();
            boolean enX = ubicacion.getX() >= Math.min(x1, x2) && ubicacion.getX() <= Math.max(x1, x2);
            boolean enY = ubicacion.getY() >= Math.min(y1, y2) && ubicacion.getY() <= Math.max(y1, y2);
            if (enX && enY) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param minutos minuto absoluto desde el inicio de la simulacion
     * @return marca de tiempo ddDhhHmmM con el dia 1-indexado
     */
    private static String comoMarca(int minutos) {
        int dia = minutos / MINUTOS_POR_DIA + 1;
        int resto = minutos % MINUTOS_POR_DIA;
        return String.format("%02dd%02dh%02dm", dia, resto / MINUTOS_POR_HORA,
                resto % MINUTOS_POR_HORA);
    }

    /**
     * @param valor  valor a acotar
     * @param maximo limite superior de la malla
     * @return valor dentro del intervalo [0, maximo]
     */
    private static int acotar(int valor, int maximo) {
        return Math.max(0, Math.min(maximo, valor));
    }

    /**
     * @param args           argumentos de linea de comandos
     * @param opcion         nombre de la opcion
     * @param valorPorDefecto valor si la opcion no aparece
     * @return valor de la opcion
     */
    private static String valorDe(String[] args, String opcion, String valorPorDefecto) {
        for (int i = 0; i + 1 < args.length; i++) {
            if (opcion.equals(args[i])) {
                return args[i + 1];
            }
        }
        return valorPorDefecto;
    }

    private GeneradorEscenarios() {
    }
}
