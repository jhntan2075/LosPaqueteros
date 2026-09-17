package pe.pucp.paqtracker.bancopruebasiaco.servicio;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.TipoVehiculo;

import java.util.EnumMap;
import java.util.Map;

/**
 * Parámetros del planificador IACO.
 *
 * <p>La v2.1 y la v3.0 comparten el mismo motor: lo que cambia son estos valores y
 * los interruptores de las mejoras M11–M18, de modo que la comparación entre
 * versiones aísla el efecto de cada mejora y no el de dos implementaciones
 * distintas.</p>
 */
public final class ParametrosIACO {

    // --- colonia -----------------------------------------------------------
    public int hormigas = 15;
    public int iteraciones = 25;
    public double alfa = 1.0;          // peso de la feromona
    public double betaHeuristica = 2.0; // peso de la visibilidad
    public double gammaUrgencia = 1.0;  // exponente de la urgencia en la visibilidad
    public double rho = 0.10;           // evaporación
    public int elite = 5;               // hormigas que depositan (Q)
    public double tauMax = 1.0;
    public double tauMin = 0.05;
    public int candidatos = 12;         // K
    public int busquedaLocalTop = 3;    // LS: soluciones que reciben búsqueda local
    public int estancamiento = 4;       // iteraciones sin mejora antes de suavizar
    public int parada = 6;              // iteraciones sin mejora antes de cortar
    public long semilla = 7;

    // --- dominio -----------------------------------------------------------
    public int bufferMinutos = 45;      // M5: holgura de seguridad en la construcción
    public int cicloMinutos = 30;
    public boolean aptitudPorCosto = true;
    public Map<TipoVehiculo, Integer> reserva = new EnumMap<>(TipoVehiculo.class);

    // --- mejoras de la v3.0 ------------------------------------------------
    /** M11: búsqueda local entre rutas (relocate, swap, 2-opt*). */
    public boolean interRutas = false;
    public int pasadasInterRutas = 2;
    /** M12: lista de candidatos por índice espacial en vez de ordenar todo el pendiente. */
    public boolean indiceEspacial = false;
    /** M13: construcción de hormigas en paralelo. */
    public boolean coloniaParalela = false;
    public int hilos = 0;               // 0 = disponibles en la máquina
    /** M14: comparación lexicográfica (incumplimientos, atraso, costo). */
    public boolean lexicografico = false;
    /** M15: regla pseudo-aleatoria de ACS y evaporación local. */
    public double q0 = 0.0;
    public double xiLocal = 0.0;
    /** M16: suavizado por factor de convergencia en vez de reinicio fijo. */
    public boolean suavizadoAdaptativo = false;
    public double umbralConvergencia = 0.92;
    /** M17: la primera hormiga de cada iteración es determinista (codiciosa). */
    public boolean hormigaCodiciosa = false;
    /** M18: reserva de flota ponderada por la demanda reciente de cada zona. */
    public boolean reservaDinamica = false;
    public int ciclosMemoriaDemanda = 16;
    /**
     * M19: modo saturación. Cuando la cola pendiente supera
     * {@code paradasPorUnidadSaturacion} paradas por unidad libre, el planificador
     * deja de exigir que cada parada llegue a tiempo y pasa a minimizar el atraso
     * total agrupando lo más posible. Sin esto, al saturarse el sistema las rutas
     * degeneran a una sola parada y el rendimiento se desploma.
     */
    public boolean modoSaturacion = false;
    public int paradasPorUnidadSaturacion = 4;
    /**
     * M21: en saturación, atender primero los pedidos que todavía alguna unidad libre
     * puede entregar dentro de plazo, y dejar detrás los ya irrecuperables.
     */
    public boolean prioridadRecuperable = false;
    /**
     * M20: en saturación, sembrar la ruta con la unidad de mayor capacidad × velocidad
     * en lugar de la más barata por kilómetro.
     */
    public boolean siembraPorRendimiento = false;

    private ParametrosIACO() {
    }

    /** Configuración publicada de la IACO v2.1 (línea base de este trabajo). */
    public static ParametrosIACO v21() {
        ParametrosIACO p = new ParametrosIACO();
        p.reserva.put(TipoVehiculo.TA, 2);
        p.reserva.put(TipoVehiculo.TM, 1);
        return p;
    }

    /** IACO v3.0: v2.1 con las mejoras M11–M18 activadas. */
    public static ParametrosIACO v30() {
        ParametrosIACO p = v21();
        p.interRutas = true;
        p.pasadasInterRutas = 2;
        p.indiceEspacial = true;
        p.coloniaParalela = true;
        p.lexicografico = true;
        p.q0 = 0.35;
        p.xiLocal = 0.10;
        p.suavizadoAdaptativo = true;
        p.hormigaCodiciosa = true;
        // M18 queda disponible pero apagada: la ablación mes a mes mostró que mover
        // la reserva según la demanda encarece el reposicionamiento sin ganar entregas.
        p.reservaDinamica = false;
        p.modoSaturacion = true;
        p.prioridadRecuperable = true;
        p.siembraPorRendimiento = true;
        // Con paralelismo y candidatos por índice espacial cabe más exploración
        // dentro del mismo presupuesto de tiempo por ciclo.
        p.hormigas = 20;
        p.iteraciones = 30;
        p.busquedaLocalTop = 4;
        return p;
    }

    public ParametrosIACO copia() {
        ParametrosIACO p = new ParametrosIACO();
        p.hormigas = hormigas;
        p.iteraciones = iteraciones;
        p.alfa = alfa;
        p.betaHeuristica = betaHeuristica;
        p.gammaUrgencia = gammaUrgencia;
        p.rho = rho;
        p.elite = elite;
        p.tauMax = tauMax;
        p.tauMin = tauMin;
        p.candidatos = candidatos;
        p.busquedaLocalTop = busquedaLocalTop;
        p.estancamiento = estancamiento;
        p.parada = parada;
        p.semilla = semilla;
        p.bufferMinutos = bufferMinutos;
        p.cicloMinutos = cicloMinutos;
        p.aptitudPorCosto = aptitudPorCosto;
        p.reserva = new EnumMap<>(reserva);
        p.interRutas = interRutas;
        p.pasadasInterRutas = pasadasInterRutas;
        p.indiceEspacial = indiceEspacial;
        p.coloniaParalela = coloniaParalela;
        p.hilos = hilos;
        p.lexicografico = lexicografico;
        p.q0 = q0;
        p.xiLocal = xiLocal;
        p.suavizadoAdaptativo = suavizadoAdaptativo;
        p.umbralConvergencia = umbralConvergencia;
        p.hormigaCodiciosa = hormigaCodiciosa;
        p.reservaDinamica = reservaDinamica;
        p.ciclosMemoriaDemanda = ciclosMemoriaDemanda;
        p.modoSaturacion = modoSaturacion;
        p.paradasPorUnidadSaturacion = paradasPorUnidadSaturacion;
        p.prioridadRecuperable = prioridadRecuperable;
        p.siembraPorRendimiento = siembraPorRendimiento;
        return p;
    }

    @Override
    public String toString() {
        return "M=" + hormigas + ", iter=" + iteraciones + ", alfa=" + alfa
                + ", beta=" + betaHeuristica + ", rho=" + rho + ", K=" + candidatos
                + ", buffer=" + bufferMinutos + ", q0=" + q0
                + ", interRutas=" + interRutas + ", paralela=" + coloniaParalela
                + ", lexicografico=" + lexicografico;
    }
}
