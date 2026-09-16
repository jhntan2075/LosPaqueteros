package pe.pucp.paqtracker.planificador;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Operadores propios de la colonia de hormigas: la construccion probabilistica
 * de una solucion guiada por feromona y visibilidad, y el deposito y la
 * evaporacion local de los rastros. Son el equivalente de OperadoresGeneticos
 * para el IACO; la reparacion, la busqueda local y el fitness siguen siendo los
 * bloques compartidos.
 *
 * Todo lo que no depende de la hormiga se precalcula una vez por ciclo: el
 * orden de las entregas por hora limite, la lista de candidatos cercanos de
 * cada entrega y la distancia real (con bloqueos) del primer tramo desde cada
 * almacen.
 */
public final class OperadoresColonia {

    /** Horizonte, en minutos, con el que la holgura premia a una unidad de siembra. */
    private static final double ESCALA_HOLGURA = 600.0;

    /** Holgura minima, en minutos, con la que se calcula la urgencia de un candidato. */
    private static final double HOLGURA_MINIMA_URGENCIA = 60.0;

    /**
     * Distancia a partir de la cual el primer tramo se considera sin camino: la
     * malla devuelve un valor enorme en ese caso, que desbordaria el reloj.
     */
    private static final int DISTANCIA_INALCANZABLE =
            (ConfiguracionDominio.MALLA_ANCHO + 1) * (ConfiguracionDominio.MALLA_ALTO + 1);

    private final EscenarioOperativo escenario;
    private final MemoriaFeromonas memoria;
    private final List<Entrega> orden;
    private final int[][] vecinos;
    private final Map<Integer, int[]> primerTramo;
    private final List<Vehiculo> libres;

    /**
     * @param escenario escenario operativo del ciclo
     * @param memoria   memoria de feromonas compartida entre ciclos
     */
    public OperadoresColonia(EscenarioOperativo escenario, MemoriaFeromonas memoria) {
        this.escenario = escenario;
        this.memoria = memoria;
        this.orden = new ArrayList<>(escenario.getEntregas());
        this.orden.sort(Comparator.comparingInt(Entrega::getHoraLimite));
        this.vecinos = calcularVecinos();
        this.primerTramo = calcularPrimerTramo();
        this.libres = new ArrayList<>();
        for (Vehiculo vehiculo : escenario.getFlotaDisponible()) {
            if (vehiculo.estaDisponible()) {
                libres.add(vehiculo);
            }
        }
    }

    /**
     * Construye la solucion de una hormiga. Cada entrega sin asignar, en orden
     * de hora limite, siembra una ruta en la unidad elegida por feromona de
     * siembra; la ruta se extiende con candidatos cercanos que llegan con
     * holgura de seguridad. Lo que no se asigna queda en espera.
     *
     * @param random          generador de la hormiga
     * @param q0              probabilidad de elegir de forma determinista la mejor opcion
     * @param alfa            peso de la feromona
     * @param beta            peso de la visibilidad
     * @param gamma           exponente de la urgencia
     * @param candidatos      tamano de la lista de candidatos
     * @param bufferMinutos   holgura de seguridad exigida al construir
     * @return solucion construida, aun sin reparar ni evaluar
     */
    public SolucionRuteo construir(Random random, double q0, double alfa, double beta,
                                   double gamma, int candidatos, int bufferMinutos) {
        SolucionRuteo solucion = new SolucionRuteo();
        boolean[] asignada = new boolean[orden.size()];
        Set<Integer> usadas = new HashSet<>();
        Map<Integer, Integer> stock = stockInicial();
        for (int semilla = 0; semilla < orden.size(); semilla++) {
            if (asignada[semilla]) {
                continue;
            }
            List<Opcion> opciones = opcionesDeSiembra(semilla, usadas, stock, bufferMinutos);
            if (opciones.isEmpty()) {
                continue;
            }
            Opcion elegida = elegirUnidad(semilla, opciones, random, q0, alfa, beta);
            Ruta ruta = extenderRuta(semilla, elegida, asignada, stock, random,
                    q0, alfa, beta, gamma, candidatos, bufferMinutos);
            usadas.add(elegida.vehiculo.getId());
            solucion.getRutas().add(ruta);
        }
        for (int i = 0; i < orden.size(); i++) {
            if (!asignada[i]) {
                solucion.getEspera().add(orden.get(i));
            }
        }
        return solucion;
    }

    /**
     * Encadena entregas a la ruta sembrada mientras haya candidatos factibles.
     *
     * @return ruta construida a partir de la semilla
     */
    private Ruta extenderRuta(int semilla, Opcion elegida, boolean[] asignada,
                              Map<Integer, Integer> stock, Random random, double q0,
                              double alfa, double beta, double gamma, int candidatos,
                              int bufferMinutos) {
        Vehiculo vehiculo = elegida.vehiculo;
        Almacen origen = vehiculo.getPosicion();
        int disponible = stock.get(origen.getId());
        Ruta ruta = new Ruta(vehiculo, origen);
        ruta.getSecuencia().add(orden.get(semilla));
        asignada[semilla] = true;
        int carga = orden.get(semilla).getCantidad();
        int ultima = semilla;
        int reloj = elegida.llegada + escenario.getTiempoServicio();
        int[] factibles = new int[candidatos];
        int[] llegadas = new int[candidatos];
        while (true) {
            int cantidad = 0;
            for (int indice : vecinos[ultima]) {
                if (cantidad == candidatos) {
                    break;
                }
                Entrega entrega = orden.get(indice);
                if (asignada[indice] || carga + entrega.getCantidad() > vehiculo.getCapacidad()
                        || carga + entrega.getCantidad() > disponible) {
                    continue;
                }
                int tramo = orden.get(ultima).getDestino().distanciaManhattan(entrega.getDestino());
                int llegada = reloj + CalculadoraTiempos.minutosDeViaje(tramo, vehiculo.getTipo());
                if (llegada + bufferMinutos <= entrega.getHoraLimite()) {
                    factibles[cantidad] = indice;
                    llegadas[cantidad] = llegada;
                    cantidad++;
                }
            }
            if (cantidad == 0) {
                break;
            }
            int elegido = elegirSiguiente(ultima, factibles, llegadas, cantidad, random,
                    q0, alfa, beta, gamma);
            int indice = factibles[elegido];
            ruta.getSecuencia().add(orden.get(indice));
            asignada[indice] = true;
            carga += orden.get(indice).getCantidad();
            reloj = llegadas[elegido] + escenario.getTiempoServicio();
            ultima = indice;
        }
        if (!origen.esIlimitado()) {
            stock.put(origen.getId(), disponible - carga);
        }
        return ruta;
    }

    /**
     * Unidades libres capaces de abrir una ruta con la entrega semilla. Si
     * alguna llega con la holgura de seguridad, solo se ofrecen esas; si no, la
     * de mayor holgura.
     */
    private List<Opcion> opcionesDeSiembra(int semilla, Set<Integer> usadas,
                                           Map<Integer, Integer> stock, int bufferMinutos) {
        Entrega entrega = orden.get(semilla);
        List<Opcion> opciones = new ArrayList<>();
        for (Vehiculo vehiculo : libres) {
            if (usadas.contains(vehiculo.getId()) || vehiculo.getCapacidad() < entrega.getCantidad()
                    || stock.get(vehiculo.getPosicion().getId()) < entrega.getCantidad()) {
                continue;
            }
            int distancia = primerTramo.get(vehiculo.getPosicion().getId())[semilla];
            if (distancia >= DISTANCIA_INALCANZABLE) {
                continue;
            }
            int llegada = escenario.getInstanteActual()
                    + CalculadoraTiempos.minutosDeViaje(distancia, vehiculo.getTipo());
            opciones.add(new Opcion(vehiculo, llegada, entrega.getHoraLimite() - llegada, distancia));
        }
        if (opciones.isEmpty()) {
            return opciones;
        }
        List<Opcion> seguras = new ArrayList<>();
        Opcion masHolgada = opciones.get(0);
        for (Opcion opcion : opciones) {
            if (opcion.holgura >= bufferMinutos) {
                seguras.add(opcion);
            }
            if (opcion.holgura > masHolgada.holgura) {
                masHolgada = opcion;
            }
        }
        return seguras.isEmpty() ? List.of(masHolgada) : seguras;
    }

    /**
     * Elige la unidad que siembra la ruta: feromona zona-tipo por visibilidad
     * (cercania y holgura), con la regla pseudoaleatoria q0.
     */
    private Opcion elegirUnidad(int semilla, List<Opcion> opciones, Random random,
                                double q0, double alfa, double beta) {
        int zona = MemoriaFeromonas.zona(orden.get(semilla).getDestino());
        double[] pesos = new double[opciones.size()];
        for (int i = 0; i < opciones.size(); i++) {
            Opcion opcion = opciones.get(i);
            double visibilidad = (1.0 / (opcion.distancia + 1))
                    * (1.0 + Math.max(0, opcion.holgura) / ESCALA_HOLGURA);
            pesos[i] = Math.pow(memoria.siembra(zona, opcion.vehiculo.getTipo()), alfa)
                    * Math.pow(visibilidad, beta);
        }
        return opciones.get(elegirIndice(pesos, pesos.length, random, q0));
    }

    /**
     * Elige la siguiente entrega de la ruta: feromona de arco por urgencia sobre
     * distancia, con la regla pseudoaleatoria q0.
     */
    private int elegirSiguiente(int ultima, int[] factibles, int[] llegadas, int cantidad,
                                Random random, double q0, double alfa, double beta, double gamma) {
        Entrega desde = orden.get(ultima);
        int zonaDesde = MemoriaFeromonas.zona(desde.getDestino());
        double[] pesos = new double[cantidad];
        for (int i = 0; i < cantidad; i++) {
            Entrega entrega = orden.get(factibles[i]);
            double distancia = Math.max(1, desde.getDestino().distanciaManhattan(entrega.getDestino()));
            double urgencia = 1.0 + ESCALA_HOLGURA
                    / Math.max(HOLGURA_MINIMA_URGENCIA, entrega.getHoraLimite() - llegadas[i]);
            double tau = memoria.arco(zonaDesde, MemoriaFeromonas.zona(entrega.getDestino()));
            pesos[i] = Math.pow(tau, alfa) * Math.pow(Math.pow(urgencia, gamma) / distancia, beta);
        }
        return elegirIndice(pesos, cantidad, random, q0);
    }

    /**
     * Regla pseudoaleatoria de ACS: con probabilidad q0 toma el mayor peso; si
     * no, ruleta proporcional.
     */
    private int elegirIndice(double[] pesos, int cantidad, Random random, double q0) {
        if (q0 > 0 && random.nextDouble() < q0) {
            int mejor = 0;
            for (int i = 1; i < cantidad; i++) {
                if (pesos[i] > pesos[mejor]) {
                    mejor = i;
                }
            }
            return mejor;
        }
        double suma = 0;
        for (int i = 0; i < cantidad; i++) {
            suma += pesos[i];
        }
        double umbral = random.nextDouble() * suma;
        double acumulado = 0;
        for (int i = 0; i < cantidad; i++) {
            acumulado += pesos[i];
            if (acumulado >= umbral) {
                return i;
            }
        }
        return cantidad - 1;
    }

    /**
     * Refuerza los rastros de siembra y de arco de las rutas de una solucion.
     *
     * @param solucion solucion cuyas rutas depositan
     * @param peso     cantidad depositada por rastro
     */
    public void depositar(SolucionRuteo solucion, double peso) {
        for (Ruta ruta : solucion.getRutas()) {
            List<Entrega> secuencia = ruta.getSecuencia();
            if (secuencia.isEmpty()) {
                continue;
            }
            memoria.depositarSiembra(MemoriaFeromonas.zona(secuencia.get(0).getDestino()),
                    ruta.getVehiculo().getTipo(), peso);
            for (int i = 0; i + 1 < secuencia.size(); i++) {
                memoria.depositarArco(MemoriaFeromonas.zona(secuencia.get(i).getDestino()),
                        MemoriaFeromonas.zona(secuencia.get(i + 1).getDestino()), peso);
            }
        }
    }

    /**
     * Evaporacion local estilo ACS sobre los arcos que recorrio una solucion.
     *
     * @param solucion solucion recien construida
     * @param xi       intensidad de la evaporacion local
     */
    public void evaporarLocal(SolucionRuteo solucion, double xi) {
        for (Ruta ruta : solucion.getRutas()) {
            List<Entrega> secuencia = ruta.getSecuencia();
            for (int i = 0; i + 1 < secuencia.size(); i++) {
                memoria.evaporarArcoLocal(MemoriaFeromonas.zona(secuencia.get(i).getDestino()),
                        MemoriaFeromonas.zona(secuencia.get(i + 1).getDestino()), xi);
            }
        }
    }

    /**
     * @return stock inicial de cada almacen, ilimitado para el central
     */
    private Map<Integer, Integer> stockInicial() {
        Map<Integer, Integer> stock = new HashMap<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            stock.put(almacen.getId(),
                    almacen.esIlimitado() ? Integer.MAX_VALUE : almacen.getStockInicial());
        }
        return stock;
    }

    /**
     * Para cada entrega, las demas ordenadas por distancia de Manhattan a su
     * destino. Se calcula una vez por ciclo.
     *
     * @return indices de vecinos por entrega
     */
    private int[][] calcularVecinos() {
        int total = orden.size();
        int[][] resultado = new int[total][];
        for (int i = 0; i < total; i++) {
            final int base = i;
            Integer[] indices = new Integer[total - 1];
            int puestos = 0;
            for (int j = 0; j < total; j++) {
                if (j != i) {
                    indices[puestos++] = j;
                }
            }
            Arrays.sort(indices, Comparator.comparingInt(
                    j -> orden.get(base).getDestino().distanciaManhattan(orden.get(j).getDestino())));
            resultado[i] = new int[indices.length];
            for (int j = 0; j < indices.length; j++) {
                resultado[i][j] = indices[j];
            }
        }
        return resultado;
    }

    /**
     * Distancia real, con los bloqueos vigentes en el instante del ciclo, desde
     * cada almacen hasta el destino de cada entrega. Evita que las hormigas
     * recalculen caminos en la malla.
     *
     * @return mapa de identificador de almacen a distancias por entrega
     */
    private Map<Integer, int[]> calcularPrimerTramo() {
        Map<Integer, int[]> resultado = new HashMap<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            int[] distancias = new int[orden.size()];
            for (int i = 0; i < orden.size(); i++) {
                distancias[i] = CalculadoraTiempos.distancia(escenario, almacen.getUbicacion(),
                        orden.get(i).getDestino(), escenario.getInstanteActual());
            }
            resultado.put(almacen.getId(), distancias);
        }
        return resultado;
    }

    /** Alternativa de siembra: unidad, llegada estimada, holgura y distancia. */
    private static final class Opcion {
        private final Vehiculo vehiculo;
        private final int llegada;
        private final int holgura;
        private final int distancia;

        private Opcion(Vehiculo vehiculo, int llegada, int holgura, int distancia) {
            this.vehiculo = vehiculo;
            this.llegada = llegada;
            this.holgura = holgura;
            this.distancia = distancia;
        }
    }
}
