package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Almacen;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Nodo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Pedido;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Ruta;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.SolucionRuteo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.TipoVehiculo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Unidad;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SplittableRandom;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Planificador por colonia de hormigas mejorada (IACO).
 *
 * <p>Un único motor cubre las dos versiones comparadas en este trabajo; lo que
 * cambia son los {@link ParametrosIACO}:</p>
 *
 * <p><b>v2.1</b> (línea base, calibrada en el prototipo Python):</p>
 * <ul>
 *   <li>M1 siembra por urgencia con elección de unidad mediante feromona zona–tipo.</li>
 *   <li>M2 lista de candidatos K = 12 y visibilidad con urgencia: {@code eta = urg^g / d}.</li>
 *   <li>M3 feromona zonal (celdas 10 × 10 km) persistente entre ciclos.</li>
 *   <li>M4 MAX-MIN con reinicio parcial por estancamiento.</li>
 *   <li>M5 holgura de seguridad (buffer) en la construcción.</li>
 *   <li>M6 primer tramo con tiempo real (A* con bloqueos) precalculado por ciclo.</li>
 *   <li>M7 pulido final con tiempos reales: reordenar, reasignar o recortar.</li>
 *   <li>M8 reserva mínima de unidades ociosas por almacén.</li>
 *   <li>M9 pedidos sin salida a tiempo: despacho individual de menor atraso.</li>
 *   <li>M10 espera útil: si salir más tarde en el mismo turno llega a tiempo, el pedido espera.</li>
 * </ul>
 *
 * <p><b>v3.0</b> (este trabajo) añade:</p>
 * <ul>
 *   <li>M11 búsqueda local <i>entre</i> rutas (reubicación e intercambio).</li>
 *   <li>M12 listas de candidatos precalculadas una vez por ciclo.</li>
 *   <li>M13 construcción de hormigas en paralelo, con semilla reproducible por hormiga.</li>
 *   <li>M14 comparación lexicográfica: incumplimientos, luego atraso, luego costo.</li>
 *   <li>M15 regla pseudo-aleatoria q0 y evaporación local estilo ACS.</li>
 *   <li>M16 suavizado guiado por el factor de convergencia de MAX-MIN.</li>
 *   <li>M17 primera hormiga determinista (referencia codiciosa en cada iteración).</li>
 *   <li>M18 reserva de flota ponderada por la demanda reciente de cada zona.</li>
 * </ul>
 */
public final class PlanificadorIACO implements Planificador {

    private final String nombre;
    private final ConfiguracionDominio cfg;
    private final CalendarioOperativo cal;
    private final ParametrosIACO par;
    private final FuncionAptitud.Pesos pesos;

    private MemoriaFeromonas feromonas;
    private ExecutorService pool;
    private long ciclo;
    /** M18: media móvil de demanda observada por zona. */
    private final double[] demandaPorZona = new double[MemoriaFeromonas.ZONAS];

    public PlanificadorIACO(String nombre, ConfiguracionDominio cfg, ParametrosIACO par) {
        this.nombre = nombre;
        this.cfg = cfg;
        this.cal = new CalendarioOperativo(cfg);
        this.par = par;
        this.pesos = FuncionAptitud.Pesos.v21();
        this.pesos.porCosto = par.aptitudPorCosto;
        this.feromonas = new MemoriaFeromonas(par.tauMin, par.tauMax);
        if (par.coloniaParalela) {
            int hilos = par.hilos > 0 ? par.hilos
                    : Math.max(2, Runtime.getRuntime().availableProcessors());
            this.pool = Executors.newFixedThreadPool(hilos, r -> {
                Thread th = new Thread(r, "hormiga");
                th.setDaemon(true);
                return th;
            });
        }
    }

    public static PlanificadorIACO v21(ConfiguracionDominio cfg) {
        return new PlanificadorIACO("IACO v2.1", cfg, ParametrosIACO.v21());
    }

    public static PlanificadorIACO v30(ConfiguracionDominio cfg) {
        return new PlanificadorIACO("IACO v3.0", cfg, ParametrosIACO.v30());
    }

    @Override
    public String nombre() {
        return nombre;
    }

    public ParametrosIACO parametros() {
        return par;
    }

    @Override
    public void reiniciar() {
        feromonas = new MemoriaFeromonas(par.tauMin, par.tauMax);
        ciclo = 0;
        java.util.Arrays.fill(demandaPorZona, 0.0);
    }

    @Override
    public void cerrar() {
        if (pool != null) {
            pool.shutdownNow();
            pool = null;
        }
    }

    @Override
    public List<Ruta> planificar(ContextoPlanificacion ctx) {
        ciclo++;
        Ciclo c = new Ciclo(ctx);
        c.precalcularDesvios();
        registrarDemanda(ctx.pendientes());

        List<Ruta> rescate = c.rescatarSinSalida();       // M9 + M10
        if (c.pend.isEmpty() || c.unis.isEmpty()) {
            for (Ruta r : rescate) {
                c.ev.real(r);
            }
            c.reservarFlota(rescate);
            return rescate;
        }

        SolucionRuteo mejor = c.ejecutarColonia();
        List<Ruta> rutas = c.pulirConTiemposReales(mejor);  // M7
        rutas.addAll(rescate);
        for (Ruta r : rutas) {
            c.ev.real(r);
        }
        c.reservarFlota(rutas);                            // M8 / M18
        return rutas;
    }

    /** M18: media móvil exponencial de la demanda por zona. */
    private void registrarDemanda(List<Pedido> pendientes) {
        double alfa = 2.0 / (par.ciclosMemoriaDemanda + 1.0);
        for (int z = 0; z < demandaPorZona.length; z++) {
            demandaPorZona[z] *= (1 - alfa);
        }
        for (Pedido p : pendientes) {
            demandaPorZona[MemoriaFeromonas.zona(p.destino())] += alfa * p.cantidad();
        }
    }

    // ==================================================================== ciclo

    /** Estado de un ciclo de replanificación. */
    private final class Ciclo {

        private final ContextoPlanificacion ctx;
        private final EvaluadorRuta ev;
        private final FuncionAptitud fa;
        private final BusquedaLocal bl;
        private final double t;

        private List<Pedido> pend;
        private List<Unidad> unis;
        private List<Pedido> orden;                 // pendientes por urgencia
        private ListaCandidatos candidatos;
        private final Map<Long, Double> desvios = new ConcurrentHashMap<>();
        /** M19: la cola pendiente excede lo que la flota libre puede absorber. */
        private final boolean saturado;
        private final FuncionAptitud.Pesos pesosCiclo;

        Ciclo(ContextoPlanificacion ctx) {
            this.ctx = ctx;
            this.ev = ctx.evaluador();
            this.fa = new FuncionAptitud(ev);
            this.bl = new BusquedaLocal(fa);
            this.t = ctx.minuto();
            this.pend = new ArrayList<>(ctx.pendientes());
            this.unis = new ArrayList<>(ctx.unidadesLibres());
            this.saturado = par.modoSaturacion && !unis.isEmpty()
                    && pend.size() > (long) par.paradasPorUnidadSaturacion * unis.size();
            this.pesosCiclo = pesos.copia();
            if (saturado) {
                // Con la cola desbordada el objetivo deja de ser "cumplir el plazo" y
                // pasa a ser "atrasar lo menos posible": penalización lineal para que
                // agrupar paradas tarde salga más barato que fragmentar rutas.
                pesosCiclo.cuadratica = false;
            }
        }

        // ---------------------------------------------------------- M6: desvíos

        private long clave(Nodo n, Pedido p, double velocidad) {
            return ((long) n.codigo(cfg.altoRejilla()) * 1_000_000L)
                    + (long) p.id() * 100L + (long) velocidad;
        }

        /**
         * M6 — retraso que los bloqueos añaden al primer tramo, frente a la distancia
         * Manhattan. Se precalcula para todas las combinaciones (almacén de la unidad,
         * pedido, velocidad) que la colonia va a consultar, de modo que el bucle de
         * hormigas no necesite tocar el A*.
         */
        void precalcularDesvios() {
            List<Nodo> posiciones = new ArrayList<>();
            List<Double> velocidades = new ArrayList<>();
            for (Unidad u : unis) {
                if (!posiciones.contains(u.posicion())) {
                    posiciones.add(u.posicion());
                }
                if (!velocidades.contains(u.velocidad())) {
                    velocidades.add(u.velocidad());
                }
            }
            List<Pedido> lista = pend;
            Runnable tarea = () -> lista.parallelStream().forEach(p -> {
                for (Nodo n : posiciones) {
                    for (double v : velocidades) {
                        desvios.put(clave(n, p, v), calcularDesvio(n, p, v));
                    }
                }
            });
            if (par.coloniaParalela) {
                tarea.run();
            } else {
                for (Pedido p : lista) {
                    for (Nodo n : posiciones) {
                        for (double v : velocidades) {
                            desvios.put(clave(n, p, v), calcularDesvio(n, p, v));
                        }
                    }
                }
            }
        }

        private double calcularDesvio(Nodo desde, Pedido p, double velocidad) {
            Ciudad.Tramo tr = ctx.ciudad().tramo(desde, p.destino(), t, velocidad);
            if (Double.isInfinite(tr.minutoLlegada())) {
                return Double.POSITIVE_INFINITY;
            }
            return Math.max(0.0, tr.minutoLlegada() - t
                    - desde.manhattan(p.destino()) * 60.0 / velocidad);
        }

        private double desvio(Nodo desde, Pedido p, double velocidad) {
            Double d = desvios.get(clave(desde, p, velocidad));
            if (d != null) {
                return d;
            }
            double calculado = calcularDesvio(desde, p, velocidad);
            desvios.put(clave(desde, p, velocidad), calculado);
            return calculado;
        }

        /** Minuto en que la unidad llega al cliente saliendo de {@code pos} en {@code tt}. */
        private double llegada(Unidad u, Nodo pos, double tt, Pedido p, boolean primerTramo) {
            double dt = pos.manhattan(p.destino()) * 60.0 / u.velocidad();
            if (primerTramo) {
                dt += desvio(pos, p, u.velocidad());
            }
            return cal.avanzar(u.indice(), tt, dt);
        }

        private double regresoMasCercano(Unidad u, double desde, Nodo pos) {
            return cal.avanzar(u.indice(), desde,
                    cfg.distanciaAlAlmacenMasCercano(pos) * 60.0 / u.velocidad());
        }

        // ------------------------------------------------- M9 / M10: sin salida

        /**
         * M9 — pedidos que ninguna unidad libre puede entregar a tiempo, ni en este
         * turno ni en el siguiente. Se sacan del conjunto que verá la colonia y, salvo
         * que valga la pena esperar (M10), se despachan solos en la unidad que termina
         * antes: así el atraso es el mínimo alcanzable en lugar de arrastrarse.
         */
        List<Ruta> rescatarSinSalida() {
            List<Ruta> rescate = new ArrayList<>();
            if (saturado) {
                // M19 — con la cola desbordada, el rescate individual es contraproducente:
                // dedicar una unidad completa a un solo paquete vencido consume la flota
                // que hace falta para agrupar. Se deja todo en manos de la colonia.
                return rescate;
            }
            Set<Integer> perdidos = new HashSet<>();
            Set<String> usadas = new HashSet<>();

            List<Pedido> porUrgencia = new ArrayList<>(pend);
            porUrgencia.sort(Comparator.comparingInt(Pedido::minutoLimite));

            for (Pedido p : porUrgencia) {
                List<Object[]> opciones = new ArrayList<>();
                boolean algunaATiempo = false;
                for (Unidad u : unis) {
                    if (u.capacidad() < p.cantidad() || ctx.disponible(u.posicion()) < p.cantidad()) {
                        continue;
                    }
                    double ts = Math.max(t, u.libreDesde());
                    double fin = cal.avanzar(u.indice(), llegada(u, u.posicion(), ts, p, true),
                            cfg.minutosEntrega());
                    double ret = regresoMasCercano(u, fin, p.destino());
                    if (fin <= p.minutoLimite() && ret <= cal.turnoFin(ts)) {
                        algunaATiempo = true;
                        break;
                    }
                    double ts2 = cal.turnoFin(ts);
                    double fin2 = cal.avanzar(u.indice(), llegada(u, u.posicion(), ts2, p, false),
                            cfg.minutosEntrega());
                    if (fin2 <= p.minutoLimite()) {
                        algunaATiempo = true;
                        break;
                    }
                    if (ret <= cal.turnoFin(ts) && !usadas.contains(u.codigo())) {
                        opciones.add(new Object[]{fin, u, ts});
                    }
                }
                if (algunaATiempo) {
                    continue;
                }
                perdidos.add(p.id());
                if (esperaUtil(p)) {
                    continue;   // M10
                }
                if (opciones.isEmpty()) {
                    continue;
                }
                opciones.sort((a, b) -> {
                    int c = Double.compare((Double) a[0], (Double) b[0]);
                    return c != 0 ? c
                            : Double.compare(((Unidad) a[1]).costoPorKm(), ((Unidad) b[1]).costoPorKm());
                });
                Object[] mejor = opciones.get(0);
                Unidad u = (Unidad) mejor[1];
                Ruta r = new Ruta(u, u.posicion(), List.of(p), (Double) mejor[2]);
                ev.real(r);
                if (!ev.desbordaTurno(r)) {
                    usadas.add(u.codigo());
                    rescate.add(r);
                }
            }

            if (!perdidos.isEmpty()) {
                List<Pedido> quedan = new ArrayList<>(pend.size());
                for (Pedido p : pend) {
                    if (!perdidos.contains(p.id())) {
                        quedan.add(p);
                    }
                }
                pend = quedan;
                List<Unidad> libres = new ArrayList<>(unis.size());
                for (Unidad u : unis) {
                    if (!usadas.contains(u.codigo())) {
                        libres.add(u);
                    }
                }
                unis = libres;
            }
            return rescate;
        }

        /**
         * Penalización que el pulido final trata de eliminar.
         *
         * <p>Con holgura, una ruta solo es aceptable si no llega tarde y cierra dentro
         * del turno. En saturación (M19) el atraso deja de ser eliminable —lo será para
         * casi todas las rutas— y solo se exige la restricción dura: volver a un almacén
         * antes del cambio de turno. Si no, el pulido desmantelaría todas las rutas.</p>
         */
        private double penalizacionPulido(Ruta r) {
            if (!saturado) {
                return ev.penalizacionReal(r);
            }
            ev.real(r);
            return Math.max(0.0, r.minutoFin() - cal.turnoFin(r.minutoSalida()));
        }

        /** M10 — ¿salir más tarde dentro del mismo turno lo entregaría a tiempo? */
        private boolean esperaUtil(Pedido p) {
            if (saturado) {
                return false;   // con cola acumulada, esperar nunca compensa
            }
            Set<String> vistos = new HashSet<>();
            List<Unidad> porVelocidad = new ArrayList<>(unis);
            porVelocidad.sort(Comparator.<Unidad>comparingDouble(Unidad::velocidad).reversed());
            for (Unidad u : porVelocidad) {
                if (u.capacidad() < p.cantidad()) {
                    continue;
                }
                String clave = u.posicion() + "|" + u.tipo() + "|" + (u.indice() % 3);
                if (!vistos.add(clave)) {
                    continue;
                }
                double ts = Math.max(t, u.libreDesde()) + par.cicloMinutos;
                while (ts < cal.turnoFin(t) && ts < p.minutoLimite()) {
                    Ruta prueba = new Ruta(u, u.posicion(), List.of(p), ts);
                    if (ev.penalizacionReal(prueba) <= 0) {
                        return true;
                    }
                    ts += par.cicloMinutos;
                }
            }
            return false;
        }

        // ------------------------------------------------------------- colonia

        SolucionRuteo ejecutarColonia() {
            orden = new ArrayList<>(pend);
            orden.sort(Comparator.comparingInt(Pedido::minutoLimite));
            if (saturado && par.prioridadRecuperable) {
                ordenarPorRecuperabilidad();
            }
            candidatos = par.indiceEspacial ? new ListaCandidatos(orden) : null;

            SolucionRuteo mejor = null;
            int sinMejora = 0;

            for (int iter = 0; iter < par.iteraciones; iter++) {
                List<SolucionRuteo> colonia = construirColonia(iter);
                // M15 — evaporación local estilo ACS sobre los arcos que recorrió la
                // colonia. Se aplica aquí, en orden de hormiga, y no dentro de la
                // construcción: así el resultado no depende del entrelazado de hilos.
                if (par.xiLocal > 0) {
                    for (SolucionRuteo s : colonia) {
                        for (Ruta r : s.rutas()) {
                            for (int i = 0; i + 1 < r.tamano(); i++) {
                                feromonas.evaporarArcoLocal(
                                        MemoriaFeromonas.zona(r.pedidos().get(i).destino()),
                                        MemoriaFeromonas.zona(r.pedidos().get(i + 1).destino()),
                                        par.xiLocal);
                            }
                        }
                    }
                }
                Comparator<SolucionRuteo> cmp = comparador();
                colonia.sort(cmp);

                int tope = Math.min(par.busquedaLocalTop, colonia.size());
                for (int i = 0; i < tope; i++) {
                    SolucionRuteo s = colonia.get(i);
                    bl.intraRuta(s, pesosCiclo);
                    if (par.interRutas && i == 0) {
                        // M11: solo sobre la mejor de la iteración; es el operador caro.
                        bl.interRutas(s, pesosCiclo, ctx, par.pasadasInterRutas, 6);
                    }
                    fa.evaluar(s, pesosCiclo);
                }
                colonia.sort(cmp);

                SolucionRuteo lider = colonia.get(0);
                if (mejor == null || cmp.compare(lider, mejor) < 0) {
                    mejor = lider.copia();
                    sinMejora = 0;
                } else {
                    sinMejora++;
                }

                feromonas.evaporar(par.rho);
                int elite = Math.min(par.elite, colonia.size());
                for (int rk = 1; rk <= elite; rk++) {
                    SolucionRuteo s = colonia.get(rk - 1);
                    double peso = par.rho * (elite - rk + 1) / elite
                            * (mejor.aptitud() / Math.max(s.aptitud(), 1e-9));
                    depositar(s, peso);
                }
                depositar(mejor, par.rho);

                if (sinMejora >= par.parada) {
                    break;
                }
                // M16 — MAX-MIN arranca con todos los rastros en τmax, así que el factor
                // de convergencia solo es informativo una vez que se han diferenciado;
                // de ahí el margen de iteraciones antes de mirarlo.
                if (par.suavizadoAdaptativo && iter >= 5
                        && feromonas.factorConvergencia() > par.umbralConvergencia) {
                    feromonas.suavizar(0.5);
                }
                if (sinMejora >= par.estancamiento) {
                    feromonas.suavizar(0.5);
                    sinMejora = 0;
                }
            }
            return mejor;
        }

        /**
         * M21 — prioridad al pedido todavía salvable (idea de Moore–Hodgson).
         *
         * <p>Ordenar por vencimiento (EDF) minimiza el <i>retraso máximo</i>, pero cuando
         * la cola desborda no minimiza el <i>número</i> de incumplimientos: la flota
         * gasta turnos en pedidos que ya no llegan a tiempo hagas lo que hagas, mientras
         * otros que sí eran recuperables se vencen esperando.</p>
         *
         * <p>Aquí el conjunto pendiente se parte en dos: los que alguna unidad libre aún
         * podría entregar dentro de plazo van primero (entre ellos, por vencimiento), y
         * los ya perdidos van detrás (también por vencimiento, para no dispararles el
         * atraso). La puerta anti-inanición del simulador garantiza que igual salgan.</p>
         */
        private void ordenarPorRecuperabilidad() {
            int n = orden.size();
            boolean[] salvable = new boolean[n];
            Map<Integer, Boolean> porId = new HashMap<>(n * 2);
            for (int i = 0; i < n; i++) {
                salvable[i] = aunSalvable(orden.get(i));
                porId.put(orden.get(i).id(), salvable[i]);
            }
            orden.sort(Comparator
                    .comparing((Pedido p) -> porId.get(p.id()) ? 0 : 1)
                    .thenComparingInt(Pedido::minutoLimite));
        }

        /** ¿Alguna unidad libre podría entregarlo todavía dentro de plazo? */
        private boolean aunSalvable(Pedido p) {
            for (Unidad u : unis) {
                if (u.capacidad() < p.cantidad()) {
                    continue;
                }
                double ts = Math.max(t, u.libreDesde());
                double llegada = cal.avanzar(u.indice(), ts,
                        u.posicion().manhattan(p.destino()) * 60.0 / u.velocidad());
                if (cal.avanzar(u.indice(), llegada, cfg.minutosEntrega()) <= p.minutoLimite()) {
                    return true;
                }
            }
            return false;
        }

        private Comparator<SolucionRuteo> comparador() {
            return par.lexicografico
                    ? SolucionRuteo::comparaLexicografico
                    : Comparator.comparingDouble(SolucionRuteo::aptitud);
        }

        /** M13 — las hormigas de una iteración se construyen en paralelo. */
        private List<SolucionRuteo> construirColonia(int iter) {
            List<SolucionRuteo> colonia = new ArrayList<>(par.hormigas);
            if (pool == null) {
                for (int h = 0; h < par.hormigas; h++) {
                    colonia.add(unaHormiga(iter, h));
                }
                return colonia;
            }
            List<Future<SolucionRuteo>> futuros = new ArrayList<>(par.hormigas);
            for (int h = 0; h < par.hormigas; h++) {
                final int hh = h;
                futuros.add(pool.submit(() -> unaHormiga(iter, hh)));
            }
            for (Future<SolucionRuteo> f : futuros) {
                try {
                    colonia.add(f.get());
                } catch (Exception e) {
                    throw new IllegalStateException("Fallo al construir una hormiga", e);
                }
            }
            return colonia;
        }

        private SolucionRuteo unaHormiga(int iter, int hormiga) {
            // Semilla determinista por (corrida, ciclo, iteración, hormiga): el resultado
            // no depende de cuántos hilos tenga la máquina.
            SplittableRandom rng = new SplittableRandom(
                    par.semilla * 1_000_003L + ciclo * 7919L + iter * 131L + hormiga);
            // M17: la hormiga 0 es determinista y sirve de referencia codiciosa.
            double q0 = (par.hormigaCodiciosa && hormiga == 0) ? 1.0 : par.q0;
            SolucionRuteo s = construir(rng, q0);
            reparar(s);
            fa.evaluar(s, pesosCiclo);
            return s;
        }

        /**
         * Construcción de una solución: se siembra cada ruta con el pedido más urgente
         * sin asignar (M1), se elige la unidad con feromona zona–tipo y se encadenan
         * paradas con la lista de candidatos (M2/M12).
         */
        private SolucionRuteo construir(SplittableRandom rng, double q0) {
            Set<Integer> asignados = new HashSet<>();
            Set<String> usadas = new HashSet<>();
            List<Ruta> rutas = new ArrayList<>();
            Map<Nodo, Integer> stk = new HashMap<>(ctx.stockIntermedio());
            Pedido[] buffer = new Pedido[par.candidatos];

            for (Pedido semilla : orden) {
                if (asignados.contains(semilla.id())) {
                    continue;
                }
                List<Opcion> opciones = opcionesDeSiembra(semilla, usadas, stk);
                if (opciones.isEmpty()) {
                    continue;
                }
                Opcion elegida = elegirUnidad(semilla, opciones, rng, q0);
                Unidad u = elegida.unidad;
                usadas.add(u.codigo());

                double lim = cal.turnoFin(elegida.salida);
                int disponible = stk.getOrDefault(u.posicion(), Almacen.STOCK_ILIMITADO);

                List<Pedido> secuencia = new ArrayList<>();
                secuencia.add(semilla);
                asignados.add(semilla.id());
                int carga = semilla.cantidad();
                Pedido ultimo = semilla;
                double tt = elegida.fin;

                while (true) {
                    int n = reunirCandidatos(ultimo, asignados, carga, u.capacidad(),
                            disponible, buffer);
                    if (n == 0) {
                        break;
                    }
                    int factibles = 0;
                    int relajados = 0;
                    double[] finPorCandidato = new double[n];
                    Pedido[] tarde = null;
                    double[] finTarde = null;
                    for (int i = 0; i < n; i++) {
                        Pedido p = buffer[i];
                        double f2 = cal.avanzar(u.indice(), llegada(u, ultimo.destino(), tt, p, false),
                                cfg.minutosEntrega());
                        // El regreso al almacén antes del cambio de turno es restricción
                        // dura (LE-023) y no se relaja nunca.
                        if (regresoMasCercano(u, f2, p.destino()) > lim) {
                            continue;
                        }
                        if (f2 + par.bufferMinutos <= p.minutoLimite()) {
                            buffer[factibles] = p;
                            finPorCandidato[factibles] = f2;
                            factibles++;
                        } else if (saturado) {
                            // M19: el pedido ya no llega a tiempo, pero sumarlo a esta ruta
                            // es mejor que dejarlo en cola esperando una unidad entera.
                            if (tarde == null) {
                                tarde = new Pedido[n];
                                finTarde = new double[n];
                            }
                            tarde[relajados] = p;
                            finTarde[relajados] = f2;
                            relajados++;
                        }
                    }
                    if (factibles == 0 && relajados == 0) {
                        break;
                    }
                    if (factibles == 0) {
                        System.arraycopy(tarde, 0, buffer, 0, relajados);
                        System.arraycopy(finTarde, 0, finPorCandidato, 0, relajados);
                        factibles = relajados;
                    }
                    int elegido = elegirSiguiente(ultimo, buffer, finPorCandidato, factibles, rng, q0);
                    Pedido p = buffer[elegido];
                    secuencia.add(p);
                    asignados.add(p.id());
                    carga += p.cantidad();
                    ultimo = p;
                    tt = finPorCandidato[elegido];
                }

                rutas.add(new Ruta(u, u.posicion(), secuencia, elegida.salida));
                if (stk.containsKey(u.posicion())) {
                    stk.merge(u.posicion(), -carga, Integer::sum);
                }
            }

            List<Pedido> diferidos = new ArrayList<>();
            for (Pedido p : pend) {
                if (!asignados.contains(p.id())) {
                    diferidos.add(p);
                }
            }
            return new SolucionRuteo(rutas, diferidos);
        }

        private int reunirCandidatos(Pedido desde, Set<Integer> asignados, int carga,
                                     int capacidad, int disponible, Pedido[] buffer) {
            ListaCandidatos.Elegible filtro = p -> !asignados.contains(p.id())
                    && carga + p.cantidad() <= capacidad
                    && carga + p.cantidad() <= disponible;
            if (candidatos != null) {
                return candidatos.cercanosA(desde, par.candidatos, filtro, buffer);
            }
            // Camino v2.1: recorrer el pendiente y quedarse con los K más cercanos.
            int n = 0;
            for (Pedido p : orden) {
                if (!filtro.test(p)) {
                    continue;
                }
                int d = desde.destino().manhattan(p.destino());
                if (n < par.candidatos) {
                    buffer[n++] = p;
                    ordenarUltimo(buffer, n, desde);
                } else if (d < desde.destino().manhattan(buffer[n - 1].destino())) {
                    buffer[n - 1] = p;
                    ordenarUltimo(buffer, n, desde);
                }
            }
            return n;
        }

        /** Sube el último elemento del buffer a su posición por distancia. */
        private void ordenarUltimo(Pedido[] buffer, int n, Pedido desde) {
            for (int i = n - 1; i > 0; i--) {
                int da = desde.destino().manhattan(buffer[i].destino());
                int db = desde.destino().manhattan(buffer[i - 1].destino());
                if (da < db) {
                    Pedido tmp = buffer[i];
                    buffer[i] = buffer[i - 1];
                    buffer[i - 1] = tmp;
                } else {
                    break;
                }
            }
        }

        /** Alternativa de siembra: unidad, minuto de salida, fin de la primera entrega. */
        private final class Opcion {
            final Unidad unidad;
            final double salida;
            final double fin;
            final double holgura;
            final double costo;

            Opcion(Unidad unidad, double salida, double fin, double holgura, double costo) {
                this.unidad = unidad;
                this.salida = salida;
                this.fin = fin;
                this.holgura = holgura;
                this.costo = costo;
            }
        }

        private List<Opcion> opcionesDeSiembra(Pedido semilla, Set<String> usadas,
                                               Map<Nodo, Integer> stk) {
            List<Opcion> opciones = new ArrayList<>();
            for (Unidad u : unis) {
                if (usadas.contains(u.codigo()) || u.capacidad() < semilla.cantidad()) {
                    continue;
                }
                if (stk.getOrDefault(u.posicion(), Almacen.STOCK_ILIMITADO) < semilla.cantidad()) {
                    continue;
                }
                double ts = Math.max(t, u.libreDesde());
                double fin = cal.avanzar(u.indice(), llegada(u, u.posicion(), ts, semilla, true),
                        cfg.minutosEntrega());
                if (regresoMasCercano(u, fin, semilla.destino()) > cal.turnoFin(ts)) {
                    continue;
                }
                double holgura = semilla.minutoLimite() - fin;
                double costo = (u.posicion().manhattan(semilla.destino()) + 1) * u.costoPorKm();
                opciones.add(new Opcion(u, ts, fin, holgura, costo));
            }
            if (opciones.isEmpty()) {
                return opciones;
            }
            // M5: preferir las opciones con holgura de seguridad; si no hay, la de mayor holgura.
            List<Opcion> seguras = new ArrayList<>();
            for (Opcion o : opciones) {
                if (o.holgura >= par.bufferMinutos) {
                    seguras.add(o);
                }
            }
            if (!seguras.isEmpty()) {
                return seguras;
            }
            Opcion mejor = opciones.get(0);
            for (Opcion o : opciones) {
                if (o.holgura > mejor.holgura) {
                    mejor = o;
                }
            }
            return List.of(mejor);
        }

        /** M1 — ruleta feromona zona–tipo × (barato y holgado), con regla q0 de ACS. */
        private Opcion elegirUnidad(Pedido semilla, List<Opcion> opciones,
                                    SplittableRandom rng, double q0) {
            int z = MemoriaFeromonas.zona(semilla.destino());
            double[] w = new double[opciones.size()];
            double suma = 0;
            for (int i = 0; i < opciones.size(); i++) {
                Opcion o = opciones.get(i);
                double tau = feromonas.siembra(z, o.unidad.tipo());
                double eta;
                if (saturado && par.siembraPorRendimiento) {
                    // M20 — con la flota al tope, la unidad valiosa no es la barata sino
                    // la que mueve más paquetes por hora. Una bicicleta cuesta 0,15/km
                    // pero carga 8 paquetes: con un pedido medio de ~5,5 gasta un turno
                    // entero en una sola entrega. Se prioriza capacidad × velocidad.
                    eta = o.unidad.capacidad() * o.unidad.velocidad()
                            / (o.unidad.posicion().manhattan(semilla.destino()) + 1.0);
                } else {
                    eta = (1.0 / o.costo) * (1.0 + o.holgura / 600.0);
                }
                w[i] = Math.pow(tau, par.alfa) * Math.pow(eta, par.betaHeuristica);
                suma += w[i];
            }
            if (q0 > 0 && rng.nextDouble() < q0) {
                int mejor = 0;
                for (int i = 1; i < w.length; i++) {
                    if (w[i] > w[mejor]) {
                        mejor = i;
                    }
                }
                return opciones.get(mejor);
            }
            double x = rng.nextDouble() * suma;
            double acumulado = 0;
            for (int i = 0; i < w.length; i++) {
                acumulado += w[i];
                if (acumulado >= x) {
                    return opciones.get(i);
                }
            }
            return opciones.get(opciones.size() - 1);
        }

        /** M2 — visibilidad con urgencia: {@code eta = urg^g / d}. */
        private int elegirSiguiente(Pedido desde, Pedido[] cand, double[] fin, int n,
                                    SplittableRandom rng, double q0) {
            int zd = MemoriaFeromonas.zona(desde.destino());
            double[] w = new double[n];
            double suma = 0;
            for (int i = 0; i < n; i++) {
                Pedido p = cand[i];
                double d = Math.max(1, desde.destino().manhattan(p.destino()));
                double urg = 1.0 + 600.0 / Math.max(60.0, p.minutoLimite() - fin[i]);
                double tau = feromonas.arco(zd, MemoriaFeromonas.zona(p.destino()));
                w[i] = Math.pow(tau, par.alfa)
                        * Math.pow(Math.pow(urg, par.gammaUrgencia) / d, par.betaHeuristica);
                suma += w[i];
            }
            if (q0 > 0 && rng.nextDouble() < q0) {
                int mejor = 0;
                for (int i = 1; i < n; i++) {
                    if (w[i] > w[mejor]) {
                        mejor = i;
                    }
                }
                return mejor;
            }
            double x = rng.nextDouble() * suma;
            double acumulado = 0;
            for (int i = 0; i < n; i++) {
                acumulado += w[i];
                if (acumulado >= x) {
                    return i;
                }
            }
            return n - 1;
        }

        /** Reparación por plazo: ordenar por vencimiento si la ruta incumple y mejora. */
        private void reparar(SolucionRuteo s) {
            for (Ruta r : s.rutas()) {
                double atraso = ev.estimar(r);
                if (atraso <= 0) {
                    continue;
                }
                List<Pedido> original = new ArrayList<>(r.pedidos());
                r.pedidos().sort(Comparator.comparingInt(Pedido::minutoLimite));
                if (ev.estimar(r) >= atraso) {
                    r.reemplazarPedidos(original);
                }
            }
            s.depurar();
        }

        private void depositar(SolucionRuteo s, double peso) {
            for (Ruta r : s.rutas()) {
                if (r.vacia()) {
                    continue;
                }
                feromonas.depositarSiembra(MemoriaFeromonas.zona(r.pedidos().get(0).destino()),
                        r.unidad().tipo(), peso);
                for (int i = 0; i + 1 < r.tamano(); i++) {
                    feromonas.depositarArco(
                            MemoriaFeromonas.zona(r.pedidos().get(i).destino()),
                            MemoriaFeromonas.zona(r.pedidos().get(i + 1).destino()), peso);
                }
            }
        }

        // ------------------------------------------------------ M7: pulido real

        /**
         * M7 — la colonia trabaja con distancias Manhattan; aquí se vuelve a cronometrar
         * con los bloqueos vigentes y se corrige lo que deje de cumplir: reordenar por
         * vencimiento, pasar la ruta entera a otra unidad, o recortar paradas y
         * reasignarlas una a una.
         */
        List<Ruta> pulirConTiemposReales(SolucionRuteo mejor) {
            List<Ruta> rutas = new ArrayList<>(mejor.rutas());
            Set<String> usadas = new HashSet<>();
            for (Ruta r : rutas) {
                usadas.add(r.unidad().codigo());
            }

            for (Ruta r : new ArrayList<>(rutas)) {
                if (penalizacionPulido(r) <= 0) {
                    continue;
                }
                List<Pedido> original = new ArrayList<>(r.pedidos());
                r.pedidos().sort(Comparator.comparingInt(Pedido::minutoLimite));
                if (penalizacionPulido(r) <= 0) {
                    continue;
                }
                Ruta reasignada = reasignar(original, usadas);
                if (reasignada != null) {
                    rutas.remove(r);
                    usadas.remove(r.unidad().codigo());
                    rutas.add(reasignada);
                    continue;
                }
                r.reemplazarPedidos(original);
                List<Pedido> sacados = new ArrayList<>();
                while (!r.vacia() && penalizacionPulido(r) > 0) {
                    ev.real(r);
                    int peor = 0;
                    double peorClave = -Double.MAX_VALUE;
                    int peorDesempate = -1;
                    for (int i = 0; i < r.tamano(); i++) {
                        Pedido p = r.pedidos().get(i);
                        double clave = r.minutoFinParada(i) - p.minutoLimite();
                        int desempate = r.origen().manhattan(p.destino());
                        if (clave > peorClave || (clave == peorClave && desempate > peorDesempate)) {
                            peorClave = clave;
                            peorDesempate = desempate;
                            peor = i;
                        }
                    }
                    sacados.add(r.pedidos().remove(peor));
                    r.invalidar();
                }
                for (Pedido p : sacados) {
                    Ruta nueva = reasignar(List.of(p), usadas);
                    if (nueva == null && !esperaUtil(p)) {
                        nueva = rescateReal(p, usadas);
                    }
                    if (nueva != null) {
                        rutas.add(nueva);
                    }
                }
                if (r.vacia()) {
                    rutas.remove(r);
                    usadas.remove(r.unidad().codigo());
                }
            }
            return rutas;
        }

        /** Busca otra unidad libre que pueda cumplir la secuencia completa a tiempo. */
        private Ruta reasignar(List<Pedido> secuencia, Set<String> usadas) {
            int carga = 0;
            for (Pedido p : secuencia) {
                carga += p.cantidad();
            }
            List<Unidad> porPreferencia = new ArrayList<>(unis);
            porPreferencia.sort(Comparator.<Unidad>comparingDouble(Unidad::velocidad).reversed()
                    .thenComparing(Comparator.comparingDouble(Unidad::costoPorKm)));
            for (Unidad u : porPreferencia) {
                if (usadas.contains(u.codigo()) || u.capacidad() < carga) {
                    continue;
                }
                if (ctx.disponible(u.posicion()) < carga) {
                    continue;
                }
                Ruta nueva = new Ruta(u, u.posicion(), secuencia, Math.max(t, u.libreDesde()));
                if (penalizacionPulido(nueva) <= 0) {
                    usadas.add(u.codigo());
                    return nueva;
                }
            }
            return null;
        }

        /**
         * M7b — si nada llega a tiempo, se despacha la opción de menor atraso real,
         * siempre que mejore a la mejor estimación del turno siguiente.
         */
        private Ruta rescateReal(Pedido p, Set<String> usadas) {
            Ruta mejor = null;
            double mejorFin = Double.MAX_VALUE;
            for (Unidad u : unis) {
                if (usadas.contains(u.codigo()) || u.capacidad() < p.cantidad()) {
                    continue;
                }
                if (ctx.disponible(u.posicion()) < p.cantidad()) {
                    continue;
                }
                Ruta nueva = new Ruta(u, u.posicion(), List.of(p), Math.max(t, u.libreDesde()));
                ev.real(nueva);
                if (ev.desbordaTurno(nueva)) {
                    continue;
                }
                if (nueva.minutoFinParada(0) < mejorFin) {
                    mejorFin = nueva.minutoFinParada(0);
                    mejor = nueva;
                }
            }
            if (mejor == null) {
                return null;
            }
            double siguienteTurno = Double.MAX_VALUE;
            for (Unidad u : unis) {
                if (u.capacidad() < p.cantidad()) {
                    continue;
                }
                double fin = cal.avanzar(u.indice(),
                        llegada(u, u.posicion(), cal.turnoFin(t), p, false), cfg.minutosEntrega());
                siguienteTurno = Math.min(siguienteTurno, fin);
            }
            if (mejorFin <= siguienteTurno) {
                usadas.add(mejor.unidad().codigo());
                return mejor;
            }
            return null;
        }

        // ------------------------------------------------- M8 / M18: reserva

        /**
         * M8 — mantener unidades ociosas repartidas por los almacenes para que el
         * siguiente ciclo tenga con qué responder. M18 ajusta el objetivo de cada
         * almacén según la demanda reciente de su zona en vez de usar un número fijo.
         */
        void reservarFlota(List<Ruta> rutas) {
            Set<String> ocupadas = new HashSet<>();
            for (Ruta r : rutas) {
                ocupadas.add(r.unidad().codigo());
            }
            List<Unidad> ociosas = new ArrayList<>();
            for (Unidad u : unis) {
                if (!ocupadas.contains(u.codigo()) && u.libreDesde() <= t) {
                    ociosas.add(u);
                }
            }
            Set<String> movidas = new HashSet<>();
            List<Almacen> almacenes = cfg.almacenes();

            for (Map.Entry<TipoVehiculo, Integer> e : par.reserva.entrySet()) {
                TipoVehiculo tipo = e.getKey();
                int base = e.getValue();
                Map<Almacen, List<Unidad>> disponibles = new HashMap<>();
                Map<Almacen, Integer> enCamino = new HashMap<>();
                for (Almacen a : almacenes) {
                    List<Unidad> aqui = new ArrayList<>();
                    for (Unidad u : ociosas) {
                        if (u.posicion().equals(a.nodo()) && u.tipo() == tipo) {
                            aqui.add(u);
                        }
                    }
                    disponibles.put(a, aqui);
                    int llegan = 0;
                    for (Unidad u : ctx.flota()) {
                        if (u.posicion().equals(a.nodo()) && u.tipo() == tipo
                                && u.libreDesde() > t && u.libreDesde() <= t + 60) {
                            llegan++;
                        }
                    }
                    enCamino.put(a, llegan);
                }
                // M18: el refuerzo extra va al almacén de mayor demanda reciente y solo
                // cuando sobran unidades ociosas de ese tipo para cubrir el mínimo.
                int ociosasTipo = 0;
                for (Almacen a : almacenes) {
                    ociosasTipo += disponibles.get(a).size();
                }
                Almacen reforzado = par.reservaDinamica && ociosasTipo > base * almacenes.size()
                        ? almacenMasDemandado(almacenes) : null;

                for (Almacen a : almacenes) {
                    int objetivo = base + (a.equals(reforzado) ? 1 : 0);
                    while (disponibles.get(a).size() + enCamino.get(a) < objetivo) {
                        Almacen fuente = null;
                        for (Almacen b : almacenes) {
                            if (b.equals(a)) {
                                continue;
                            }
                            if (fuente == null
                                    || disponibles.get(b).size() > disponibles.get(fuente).size()) {
                                fuente = b;
                            }
                        }
                        if (fuente == null
                                || disponibles.get(fuente).size() <= base + (fuente.equals(reforzado) ? 1 : 0)) {
                            break;
                        }
                        Unidad candidata = null;
                        for (Unidad u : disponibles.get(fuente)) {
                            if (!movidas.contains(u.codigo())) {
                                candidata = u;
                                break;
                            }
                        }
                        if (candidata == null) {
                            break;
                        }
                        disponibles.get(fuente).remove(candidata);
                        disponibles.get(a).add(candidata);
                        movidas.add(candidata.codigo());
                        ctx.proponerReubicacion(candidata, a);
                    }
                }
            }
        }

        /** M18 — almacén cuya vecindad concentra más demanda reciente. */
        private Almacen almacenMasDemandado(List<Almacen> almacenes) {
            Almacen mejor = null;
            double mejorCuota = -1;
            for (Almacen a : almacenes) {
                double propia = 0;
                int zonaAlmacen = MemoriaFeromonas.zona(a.nodo());
                for (int z = 0; z < demandaPorZona.length; z++) {
                    if (z == zonaAlmacen || vecinaDe(z, zonaAlmacen)) {
                        propia += demandaPorZona[z];
                    }
                }
                if (propia > mejorCuota) {
                    mejorCuota = propia;
                    mejor = a;
                }
            }
            return mejorCuota > 0 ? mejor : null;
        }

        private boolean vecinaDe(int z, int centro) {
            int zx = z / 6;
            int zy = z % 6;
            int cx = centro / 6;
            int cy = centro % 6;
            return Math.abs(zx - cx) <= 1 && Math.abs(zy - cy) <= 1;
        }
    }
}
