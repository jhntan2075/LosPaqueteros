package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Construye soluciones iniciales para la poblacion. Ofrece dos estrategias que
 * conforman la poblacion hibrida: una construccion golosa por cercania, que
 * aporta calidad, y una construccion aleatoria, que aporta diversidad y evita
 * que la poblacion converja a clones en las primeras generaciones.
 *
 * Este bloque es compartido por todos los algoritmos metaheuristicos y no debe
 * duplicarse ni modificarse localmente.
 */
public final class ConstructorSoluciones {

    private static final int CANDIDATOS_CERCANOS = 3;

    private final EscenarioOperativo escenario;
    private final Reparador reparador;
    private final Random random;

    /**
     * @param escenario escenario operativo con flota, almacenes y entregas
     * @param reparador reparador para fijar destinos validos
     * @param random    generador aleatorio con semilla fija
     */
    public ConstructorSoluciones(EscenarioOperativo escenario, Reparador reparador, Random random) {
        this.escenario = escenario;
        this.reparador = reparador;
        this.random = random;
    }

    /**
     * Construye un individuo goloso: agrupa entregas al almacen mas cercano con
     * unidad de capacidad suficiente y rutea por vecino cercano.
     *
     * @return solucion construida por cercania
     */
    public SolucionRuteo construirGoloso() {
        SolucionRuteo solucion = new SolucionRuteo();
        List<Vehiculo> libres = obtenerLibres();
        Map<Integer, List<Entrega>> grupos = agruparPorAlmacen(libres);
        Map<Integer, Integer> stock = stockInicialPorAlmacen();
        for (Almacen almacen : escenario.getAlmacenes()) {
            construirRutasDeAlmacen(solucion, almacen, grupos.get(almacen.getId()), libres, stock);
        }
        fijarDestinos(solucion);
        return solucion;
    }

    /**
     * Construye un individuo aleatorio: baraja unidades y entregas y las asigna
     * al azar respetando capacidad y stock. Aporta diversidad a la poblacion.
     *
     * @return solucion construida aleatoriamente
     */
    public SolucionRuteo construirAleatorio() {
        SolucionRuteo solucion = new SolucionRuteo();
        List<Vehiculo> libres = obtenerLibres();
        Collections.shuffle(libres, random);
        List<Entrega> entregas = new ArrayList<>(escenario.getEntregas());
        Collections.shuffle(entregas, random);
        Map<Integer, Integer> stock = stockInicialPorAlmacen();
        int indiceVehiculo = 0;
        for (Entrega entrega : entregas) {
            if (colocarEnRutaExistente(solucion, entrega, stock)) {
                continue;
            }
            indiceVehiculo = colocarEnVehiculoLibre(solucion, entrega, libres, indiceVehiculo, stock);
        }
        fijarDestinos(solucion);
        return solucion;
    }

    /**
     * @return lista de unidades disponibles para planificar
     */
    private List<Vehiculo> obtenerLibres() {
        List<Vehiculo> libres = new ArrayList<>();
        for (Vehiculo vehiculo : escenario.getFlotaDisponible()) {
            if (vehiculo.estaDisponible()) {
                libres.add(vehiculo);
            }
        }
        return libres;
    }

    /**
     * @return stock inicial de cada almacen, mapeado por identificador
     */
    private Map<Integer, Integer> stockInicialPorAlmacen() {
        Map<Integer, Integer> stock = new HashMap<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            stock.put(almacen.getId(),
                    almacen.esIlimitado() ? Integer.MAX_VALUE : almacen.getStockInicial());
        }
        return stock;
    }

    /**
     * Agrupa cada entrega al almacen mas cercano que tenga una unidad con
     * capacidad suficiente para atenderla. Si ninguno la tiene, la asigna al
     * almacen con la mayor capacidad disponible.
     *
     * @param libres unidades disponibles
     * @return mapa de identificador de almacen a sus entregas
     */
    private Map<Integer, List<Entrega>> agruparPorAlmacen(List<Vehiculo> libres) {
        Set<Integer> conFlota = new HashSet<>();
        Map<Integer, Integer> capacidadMaxima = new HashMap<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            capacidadMaxima.put(almacen.getId(), 0);
        }
        for (Vehiculo vehiculo : libres) {
            conFlota.add(vehiculo.getPosicion().getId());
            capacidadMaxima.merge(vehiculo.getPosicion().getId(), vehiculo.getCapacidad(), Math::max);
        }
        Map<Integer, List<Entrega>> grupos = new HashMap<>();
        for (Almacen almacen : escenario.getAlmacenes()) {
            grupos.put(almacen.getId(), new ArrayList<>());
        }
        for (Entrega entrega : escenario.getEntregas()) {
            Almacen elegido = elegirAlmacenParaEntrega(entrega, conFlota, capacidadMaxima);
            grupos.get(elegido.getId()).add(entrega);
        }
        return grupos;
    }

    /**
     * Elige el almacen de agrupamiento de una entrega segun cercania y
     * capacidad suficiente.
     *
     * @param entrega         entrega a agrupar
     * @param conFlota        identificadores de almacenes con unidades
     * @param capacidadMaxima capacidad maxima disponible por almacen
     * @return almacen elegido
     */
    private Almacen elegirAlmacenParaEntrega(Entrega entrega, Set<Integer> conFlota,
                                             Map<Integer, Integer> capacidadMaxima) {
        Almacen mejor = null;
        int minima = Integer.MAX_VALUE;
        for (Almacen almacen : escenario.getAlmacenes()) {
            if (!conFlota.contains(almacen.getId())
                    || capacidadMaxima.get(almacen.getId()) < entrega.getCantidad()) {
                continue;
            }
            int distancia = almacen.getUbicacion().distanciaManhattan(entrega.getDestino());
            if (distancia < minima) {
                minima = distancia;
                mejor = almacen;
            }
        }
        if (mejor == null) {
            mejor = almacenDeMayorCapacidad(conFlota, capacidadMaxima);
        }
        return mejor != null ? mejor : escenario.getAlmacenes().get(0);
    }

    /**
     * @param conFlota        identificadores de almacenes con unidades
     * @param capacidadMaxima capacidad maxima disponible por almacen
     * @return almacen con la mayor capacidad disponible
     */
    private Almacen almacenDeMayorCapacidad(Set<Integer> conFlota, Map<Integer, Integer> capacidadMaxima) {
        Almacen mejor = null;
        int mejorCapacidad = -1;
        for (Almacen almacen : escenario.getAlmacenes()) {
            if (conFlota.contains(almacen.getId())
                    && capacidadMaxima.get(almacen.getId()) > mejorCapacidad) {
                mejorCapacidad = capacidadMaxima.get(almacen.getId());
                mejor = almacen;
            }
        }
        return mejor;
    }

    /**
     * Construye rutas para las entregas de un almacen, tomando unidades libres
     * de ese almacen hasta agotar las entregas o las unidades.
     *
     * @param solucion  solucion en construccion
     * @param almacen   almacen de partida
     * @param pendientes entregas asignadas al almacen
     * @param libres    unidades disponibles (se consumen)
     * @param stock     stock por almacen (se descuenta)
     */
    private void construirRutasDeAlmacen(SolucionRuteo solucion, Almacen almacen,
                                         List<Entrega> pendientes, List<Vehiculo> libres,
                                         Map<Integer, Integer> stock) {
        List<Entrega> porAtender = new ArrayList<>(pendientes);
        while (!porAtender.isEmpty()) {
            List<Vehiculo> aptos = unidadesEn(almacen, libres);
            if (aptos.isEmpty()) {
                break;
            }
            List<Entrega> cluster = construirCluster(almacen, porAtender, aptos, stock);
            if (cluster.isEmpty()) {
                break;
            }
            Vehiculo elegido = elegirUnidad(aptos, cargaDe(cluster));
            libres.remove(elegido);
            Ruta ruta = new Ruta(elegido, almacen);
            ruta.getSecuencia().addAll(cluster);
            if (!almacen.esIlimitado()) {
                stock.put(almacen.getId(), stock.get(almacen.getId()) - cargaDe(cluster));
            }
            solucion.getRutas().add(ruta);
        }
        solucion.getEspera().addAll(porAtender);
    }

    /**
     * Construye un cluster de entregas por vecino cercano, con tope de carga
     * sesgado hacia unidades pequenas pero garantizando que el pedido pendiente
     * que quepa en la unidad mayor no quede excluido.
     *
     * @param almacen   almacen de partida
     * @param porAtender entregas pendientes (se consumen las incluidas)
     * @param aptos     unidades disponibles en el almacen
     * @param stock     stock por almacen
     * @return lista de entregas del cluster
     */
    private List<Entrega> construirCluster(Almacen almacen, List<Entrega> porAtender,
                                           List<Vehiculo> aptos, Map<Integer, Integer> stock) {
        int tope = calcularTope(porAtender, aptos);
        List<Entrega> cluster = new ArrayList<>();
        Nodo actual = almacen.getUbicacion();
        int carga = 0;
        while (!porAtender.isEmpty()) {
            Entrega proxima = elegirProxima(actual, porAtender);
            if (carga + proxima.getCantidad() > tope) {
                break;
            }
            if (!almacen.esIlimitado() && carga + proxima.getCantidad() > stock.get(almacen.getId())) {
                break;
            }
            cluster.add(proxima);
            carga += proxima.getCantidad();
            actual = proxima.getDestino();
            porAtender.remove(proxima);
        }
        if (cluster.isEmpty()) {
            forzarEntregaMinima(almacen, porAtender, aptos, stock, cluster);
        }
        return cluster;
    }

    /**
     * Calcula el tope de carga del cluster: menor capacidad de dos unidades al
     * azar, elevado si es necesario para que el menor pedido que cabe en la
     * unidad mayor pueda entrar.
     *
     * @param porAtender entregas pendientes
     * @param aptos      unidades disponibles
     * @return tope de carga del cluster
     */
    private int calcularTope(List<Entrega> porAtender, List<Vehiculo> aptos) {
        int capacidadUno = aptos.get(random.nextInt(aptos.size())).getCapacidad();
        int capacidadDos = aptos.get(random.nextInt(aptos.size())).getCapacidad();
        int tope = Math.min(capacidadUno, capacidadDos);
        int capacidadMaxima = 0;
        for (Vehiculo vehiculo : aptos) {
            capacidadMaxima = Math.max(capacidadMaxima, vehiculo.getCapacidad());
        }
        int menorPendiente = Integer.MAX_VALUE;
        for (Entrega entrega : porAtender) {
            if (entrega.getCantidad() <= capacidadMaxima) {
                menorPendiente = Math.min(menorPendiente, entrega.getCantidad());
            }
        }
        if (menorPendiente != Integer.MAX_VALUE && tope < menorPendiente) {
            tope = menorPendiente;
        }
        return tope;
    }

    /**
     * Si el cluster quedo vacio, fuerza la entrega mas pequena que quepa en la
     * unidad mayor para no abandonarla.
     *
     * @param almacen    almacen de partida
     * @param porAtender entregas pendientes
     * @param aptos      unidades disponibles
     * @param stock      stock por almacen
     * @param cluster    cluster a completar
     */
    private void forzarEntregaMinima(Almacen almacen, List<Entrega> porAtender, List<Vehiculo> aptos,
                                     Map<Integer, Integer> stock, List<Entrega> cluster) {
        int capacidadMaxima = 0;
        for (Vehiculo vehiculo : aptos) {
            capacidadMaxima = Math.max(capacidadMaxima, vehiculo.getCapacidad());
        }
        Entrega forzar = null;
        for (Entrega entrega : porAtender) {
            boolean cabe = entrega.getCantidad() <= capacidadMaxima
                    && (almacen.esIlimitado() || entrega.getCantidad() <= stock.get(almacen.getId()));
            if (cabe && (forzar == null || entrega.getCantidad() < forzar.getCantidad())) {
                forzar = entrega;
            }
        }
        if (forzar != null) {
            cluster.add(forzar);
            porAtender.remove(forzar);
        }
    }

    /**
     * Elige la proxima entrega del cluster al azar entre las mas cercanas al
     * punto actual, para dar diversidad a la construccion.
     *
     * @param actual     nodo actual del recorrido
     * @param porAtender entregas pendientes
     * @return entrega elegida
     */
    private Entrega elegirProxima(Nodo actual, List<Entrega> porAtender) {
        List<Entrega> candidatas = new ArrayList<>(porAtender);
        candidatas.sort(Comparator.comparingInt(
                entrega -> actual.distanciaManhattan(entrega.getDestino())));
        int limite = Math.min(CANDIDATOS_CERCANOS, candidatas.size());
        return candidatas.get(random.nextInt(limite));
    }

    /**
     * Elige la unidad de menor capacidad suficiente para la carga del cluster.
     *
     * @param aptos unidades disponibles
     * @param carga carga del cluster
     * @return unidad elegida
     */
    private Vehiculo elegirUnidad(List<Vehiculo> aptos, int carga) {
        aptos.sort(Comparator.comparingInt(Vehiculo::getCapacidad));
        for (Vehiculo vehiculo : aptos) {
            if (vehiculo.getCapacidad() >= carga) {
                return vehiculo;
            }
        }
        return aptos.get(aptos.size() - 1);
    }

    /**
     * @param almacen almacen consultado
     * @param libres  unidades disponibles
     * @return unidades libres ubicadas en el almacen
     */
    private List<Vehiculo> unidadesEn(Almacen almacen, List<Vehiculo> libres) {
        List<Vehiculo> aptos = new ArrayList<>();
        for (Vehiculo vehiculo : libres) {
            if (vehiculo.getPosicion().getId() == almacen.getId()) {
                aptos.add(vehiculo);
            }
        }
        return aptos;
    }

    /**
     * Intenta colocar una entrega en una ruta existente con holgura.
     *
     * @param solucion solucion en construccion
     * @param entrega  entrega a colocar
     * @param stock    stock por almacen
     * @return verdadero si la entrega se coloco
     */
    private boolean colocarEnRutaExistente(SolucionRuteo solucion, Entrega entrega,
                                           Map<Integer, Integer> stock) {
        List<Ruta> rutas = new ArrayList<>(solucion.getRutas());
        Collections.shuffle(rutas, random);
        for (Ruta ruta : rutas) {
            boolean cabeCapacidad = ruta.getCarga() + entrega.getCantidad()
                    <= ruta.getVehiculo().getCapacidad();
            boolean cabeStock = ruta.getOrigen().esIlimitado()
                    || stock.get(ruta.getOrigen().getId()) >= entrega.getCantidad();
            if (cabeCapacidad && cabeStock) {
                ruta.getSecuencia().add(entrega);
                return true;
            }
        }
        return false;
    }

    /**
     * Coloca una entrega en la siguiente unidad libre, si tiene capacidad y
     * stock; en caso contrario la envia a la cola de espera.
     *
     * @param solucion       solucion en construccion
     * @param entrega        entrega a colocar
     * @param libres         unidades disponibles
     * @param indiceVehiculo indice de la proxima unidad libre
     * @param stock          stock por almacen
     * @return indice actualizado de la proxima unidad libre
     */
    private int colocarEnVehiculoLibre(SolucionRuteo solucion, Entrega entrega, List<Vehiculo> libres,
                                       int indiceVehiculo, Map<Integer, Integer> stock) {
        if (indiceVehiculo < libres.size()) {
            Vehiculo vehiculo = libres.get(indiceVehiculo);
            boolean cabeStock = vehiculo.getPosicion().esIlimitado()
                    || stock.get(vehiculo.getPosicion().getId()) >= entrega.getCantidad();
            if (vehiculo.getCapacidad() >= entrega.getCantidad() && cabeStock) {
                Ruta ruta = new Ruta(vehiculo, vehiculo.getPosicion());
                ruta.getSecuencia().add(entrega);
                if (!vehiculo.getPosicion().esIlimitado()) {
                    stock.put(vehiculo.getPosicion().getId(),
                            stock.get(vehiculo.getPosicion().getId()) - entrega.getCantidad());
                }
                solucion.getRutas().add(ruta);
                return indiceVehiculo + 1;
            }
        }
        solucion.getEspera().add(entrega);
        return indiceVehiculo;
    }

    /**
     * Fija el almacen de destino de cada ruta segun el stock proyectado.
     *
     * @param solucion solucion cuyas rutas reciben destino
     */
    private void fijarDestinos(SolucionRuteo solucion) {
        Map<Integer, Integer> stock = InventarioProyectado.calcular(solucion, escenario);
        for (Ruta ruta : solucion.getRutas()) {
            if (!ruta.getSecuencia().isEmpty()) {
                Nodo ultimo = ruta.getSecuencia().get(ruta.getSecuencia().size() - 1).getDestino();
                ruta.setDestino(reparador.almacenValido(ultimo, stock));
            }
        }
    }

    /**
     * @param cluster cluster de entregas
     * @return carga total del cluster
     */
    private int cargaDe(List<Entrega> cluster) {
        int carga = 0;
        for (Entrega entrega : cluster) {
            carga += entrega.getCantidad();
        }
        return carga;
    }
}
