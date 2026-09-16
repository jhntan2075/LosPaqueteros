package pe.pucp.paqtracker.iaco.servicio;

import pe.pucp.paqtracker.iaco.modelo.Almacen;
import pe.pucp.paqtracker.iaco.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.iaco.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.iaco.modelo.Nodo;
import pe.pucp.paqtracker.iaco.modelo.Pedido;
import pe.pucp.paqtracker.iaco.modelo.Ruta;
import pe.pucp.paqtracker.iaco.modelo.TipoVehiculo;
import pe.pucp.paqtracker.iaco.modelo.Unidad;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Simulador de operación mes a mes.
 *
 * <p>Avanza en ciclos de replanificación de 30 minutos. En cada ciclo incorpora los
 * pedidos registrados, reúne las unidades libres y no en mantenimiento, pide un plan
 * y lo somete a tres filtros antes de despachar:</p>
 * <ol>
 *   <li><b>Puerta de consolidación</b>: una ruta con menos del 60 % de carga espera,
 *       salvo que alguno de sus pedidos ya no soporte otro ciclo de espera.</li>
 *   <li><b>Fin de turno</b> (LE-023): la ruta debe cerrar en un almacén dentro del turno.</li>
 *   <li><b>Stock del almacén</b> (LE-018): el intermedio debe tener los paquetes.</li>
 * </ol>
 *
 * <p>Los tiempos se cronometran con A* sobre los bloqueos vigentes, no con la
 * estimación Manhattan que usa la colonia por dentro.</p>
 */
public final class Simulador {

    private final EscenarioOperativo escenario;
    private final ConfiguracionDominio cfg;
    private final CalendarioOperativo calendario;
    private final Ciudad ciudad;
    private final EvaluadorRuta evaluador;
    private final int ciclo;
    private final double cargaMinima;
    private final int maxDiferimientos;

    /**
     * @param cargaMinima      fracción de capacidad por debajo de la cual la ruta espera
     * @param maxDiferimientos ciclos que un pedido puede quedar en cola antes de que su
     *                         ruta se despache aunque no llene: evita que un pedido
     *                         pequeño quede represado indefinidamente esperando carga
     */
    public Simulador(EscenarioOperativo escenario, int cicloMinutos, double cargaMinima,
                     int maxDiferimientos) {
        this.escenario = escenario;
        this.cfg = escenario.configuracion();
        this.calendario = new CalendarioOperativo(cfg);
        this.ciudad = new Ciudad(cfg, escenario.bloqueos());
        this.evaluador = new EvaluadorRuta(cfg, calendario, ciudad);
        this.ciclo = cicloMinutos;
        this.cargaMinima = cargaMinima;
        this.maxDiferimientos = maxDiferimientos;
    }

    public Simulador(EscenarioOperativo escenario) {
        this(escenario, 30, 0.6, 24);
    }

    public Ciudad ciudad() {
        return ciudad;
    }

    public CalendarioOperativo calendario() {
        return calendario;
    }

    public Metricas ejecutar(Planificador planificador) {
        long inicio = System.nanoTime();
        escenario.reiniciarPedidos();
        planificador.reiniciar();

        List<Pedido> todos = escenario.pedidos();
        List<Unidad> flota = escenario.crearFlota();
        Map<Nodo, Integer> stock = new HashMap<>();
        for (Almacen a : cfg.almacenesIntermedios()) {
            stock.put(a.nodo(), a.stockInicial());
        }

        List<Pedido> pendientes = new ArrayList<>();
        int siguiente = 0;
        String colapso = null;
        double kmVacio = 0;
        int rutasDespachadas = 0;
        double minutosEnRuta = 0;
        List<Double> tiemposPlan = new ArrayList<>();

        int horizonte = escenario.horizonteMinutos();
        for (int t = 0; t < horizonte; t += ciclo) {
            if (t % 1440 == 0 && t > 0) {
                for (Almacen a : cfg.almacenesIntermedios()) {
                    stock.put(a.nodo(), a.stockInicial());   // LE-017: reposición diaria
                }
            }
            int dia = t / 1440 + 1;
            Set<String> enTaller = escenario.enMantenimiento(dia);

            while (siguiente < todos.size() && todos.get(siguiente).minutoRegistro() <= t) {
                pendientes.add(todos.get(siguiente));
                siguiente++;
            }
            if (colapso == null) {
                for (Pedido p : pendientes) {
                    if (p.minutoLimite() < t) {
                        colapso = "min " + p.minutoLimite() + ", pedido " + p.id() + ", sin despachar";
                        break;
                    }
                }
            }

            List<Unidad> libres = new ArrayList<>();
            if (calendario.turnoFin(t) - t >= 60) {
                for (Unidad u : flota) {
                    if (u.libreDesde() <= t && !enTaller.contains(u.codigo())) {
                        libres.add(u);
                    }
                }
            }
            if (pendientes.isEmpty() || libres.isEmpty()) {
                continue;
            }

            ContextoPlanificacion ctx = new ContextoPlanificacion(
                    t, List.copyOf(pendientes), libres, flota, stock, evaluador);
            long t0 = System.nanoTime();
            List<Ruta> rutas = planificador.planificar(ctx);
            tiemposPlan.add((System.nanoTime() - t0) / 1e6);

            Set<Integer> despachados = new HashSet<>();
            for (Ruta r : rutas) {
                if (r.vacia()) {
                    continue;
                }
                evaluador.real(r);
                double finTurno = calendario.turnoFin(r.minutoSalida());
                boolean cierraTurno = r.minutoFin() + ciclo + calendario.minutosRefrigerio() > finTurno;
                boolean urgente = false;
                for (int i = 0; i < r.tamano() && !urgente; i++) {
                    Pedido p = r.pedidos().get(i);
                    double margen = p.minutoLimite() - r.minutoFinParada(i);
                    double proximoCiclo = ciclo + calendario.minutosRefrigerio() + 45;
                    urgente = margen < proximoCiclo
                            || (cierraTurno && finTurno + (r.minutoFinParada(i) - r.minutoSalida())
                                + calendario.minutosRefrigerio() + 45 > p.minutoLimite())
                            || p.diferimientos() >= maxDiferimientos;
                }
                if (r.carga() < cargaMinima * r.unidad().capacidad() && !urgente) {
                    continue;   // puerta de consolidación
                }
                if (evaluador.desbordaTurno(r)) {
                    continue;   // relevo en almacén al cambio de turno
                }
                Integer disponible = stock.get(r.origen());
                if (disponible != null) {
                    if (disponible < r.carga()) {
                        continue;
                    }
                    stock.put(r.origen(), disponible - r.carga());
                }
                for (int i = 0; i < r.tamano(); i++) {
                    Pedido p = r.pedidos().get(i);
                    p.registrarEntrega(r.minutoFinParada(i), r.unidad().codigo());
                    if (p.minutoEntrega() > p.minutoLimite() && colapso == null) {
                        colapso = "min " + Math.round(p.minutoEntrega()) + ", pedido " + p.id()
                                + ", entrega tardía " + r.unidad().codigo();
                    }
                    despachados.add(p.id());
                }
                rutasDespachadas++;
                minutosEnRuta += r.minutoFin() - r.minutoSalida();
                r.unidad().ocuparHasta(r.minutoFin());
                r.unidad().moverA(r.retorno().nodo());
                r.unidad().acumularKm(r.km());
            }

            // Reposicionamientos en vacío propuestos por el planificador (M8/M18).
            for (ContextoPlanificacion.Reubicacion mov : ctx.reubicaciones()) {
                Unidad u = mov.unidad();
                if (u.libreDesde() > t || participaEnDespacho(u, rutas, t)) {
                    continue;
                }
                int km = u.posicion().manhattan(mov.destino().nodo());
                double llegada = calendario.avanzar(u.indice(), t, km * u.minutosPorKm());
                if (llegada > calendario.turnoFin(t)) {
                    continue;
                }
                u.acumularKm(km);
                u.moverA(mov.destino().nodo());
                u.ocuparHasta(llegada);
                kmVacio += km;
            }

            List<Pedido> quedan = new ArrayList<>(pendientes.size());
            for (Pedido p : pendientes) {
                if (!despachados.contains(p.id())) {
                    p.diferir();
                    quedan.add(p);
                }
            }
            pendientes = quedan;
        }

        // Minutos-unidad disponibles: flota menos la que está en taller cada día, por
        // los tres turnos de 8 h. Se cuenta sobre el horizonte completo (mes + colchón),
        // porque las rutas del último día terminan dentro de ese colchón.
        double minutosDisponibles = 0;
        for (int dia = 1; dia <= escenario.horizonteMinutos() / 1440; dia++) {
            int operativas = flota.size() - escenario.enMantenimiento(dia).size();
            minutosDisponibles += (double) operativas * 3 * calendario.duracionTurno();
        }

        return construirMetricas(planificador, flota, tiemposPlan, colapso, kmVacio,
                rutasDespachadas, minutosEnRuta, minutosDisponibles,
                (System.nanoTime() - inicio) / 1_000_000L);
    }

    private boolean participaEnDespacho(Unidad u, List<Ruta> rutas, double t) {
        for (Ruta r : rutas) {
            if (!r.vacia() && r.unidad() == u && u.libreDesde() > t) {
                return true;
            }
        }
        return false;
    }

    private Metricas construirMetricas(Planificador planificador, List<Unidad> flota,
                                       List<Double> tiemposPlan, String colapso,
                                       double kmVacio, int rutasDespachadas,
                                       double minutosEnRuta, double minutosDisponibles,
                                       long msCorrida) {
        List<Pedido> todos = escenario.pedidos();
        int enPlazo = 0;
        int tardios = 0;
        int entregados = 0;
        double holguraMin = Double.MAX_VALUE;
        double holguraSuma = 0;
        List<Integer> idsTardios = new ArrayList<>();
        List<Integer> idsSinEntregar = new ArrayList<>();
        for (Pedido p : todos) {
            if (!p.entregado()) {
                idsSinEntregar.add(p.id());
                continue;
            }
            entregados++;
            if (p.aTiempo()) {
                enPlazo++;
                double h = (p.minutoLimite() - p.minutoEntrega()) / 60.0;
                holguraMin = Math.min(holguraMin, h);
                holguraSuma += h;
            } else {
                tardios++;
                idsTardios.add(p.id());
            }
        }

        double km = 0;
        double costo = 0;
        Map<TipoVehiculo, Double> kmPorTipo = new EnumMap<>(TipoVehiculo.class);
        for (TipoVehiculo tv : TipoVehiculo.values()) {
            kmPorTipo.put(tv, 0.0);
        }
        for (Unidad u : flota) {
            km += u.kmAcumulados();
            costo += u.costoAcumulado();
            kmPorTipo.merge(u.tipo(), u.kmAcumulados(), Double::sum);
        }

        double medio = 0;
        double maximo = 0;
        for (double ms : tiemposPlan) {
            medio += ms;
            maximo = Math.max(maximo, ms);
        }
        medio = tiemposPlan.isEmpty() ? 0 : medio / tiemposPlan.size();

        return new Metricas(planificador.nombre(), escenario.etiqueta(), escenario.diasMes(),
                todos.size(), enPlazo,
                tardios, todos.size() - entregados, km, kmVacio, costo, kmPorTipo,
                rutasDespachadas,
                rutasDespachadas == 0 ? 0 : (double) entregados / rutasDespachadas,
                minutosDisponibles == 0 ? 0 : minutosEnRuta / minutosDisponibles,
                tiemposPlan.size(), medio, maximo,
                enPlazo == 0 ? 0 : holguraMin, enPlazo == 0 ? 0 : holguraSuma / enPlazo,
                colapso, idsTardios, idsSinEntregar, msCorrida);
    }
}
