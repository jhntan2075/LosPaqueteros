package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import pe.pucp.paqtracker.util.CalendarioTurnos;

/**
 * Funcion de fitness del planificador. A menor valor, mejor solucion.
 *
 * fitness = distanciaTotal
 *         + PESO_INCUMPLIMIENTO * (incumplimientos de plazo)^2
 *         + PESO_ESPERA         * suma(urgencia * entrega en espera)
 *         + PESO_HOLGURA        * suma(max(0, umbral - holgura)^2)
 *
 * La distancia es el costo operativo base. Los otros tres terminos atacan el
 * objetivo del negocio de retrasar el colapso logistico. La capacidad y el
 * stock no aparecen aqui: son restricciones duras que el reparador garantiza
 * antes de evaluar, porque siempre son reparables.
 *
 * Este bloque es compartido por todos los algoritmos metaheuristicos y no debe
 * duplicarse ni modificarse localmente.
 */
public final class EvaluadorFitness {

    /**
     * Peso del incumplimiento de plazo. Se fija muy alto porque un
     * incumplimiento equivale al colapso logistico; debe dominar sobre
     * cualquier ahorro de distancia posible en la malla.
     */
    public static final double PESO_INCUMPLIMIENTO = 5000.0;

    /** Peso de dejar una entrega en espera, ponderado por su urgencia. */
    public static final double PESO_ESPERA = 50.0;

    /** Peso de la proteccion de holgura minima cerca del vencimiento. */
    public static final double PESO_HOLGURA = 20.0;

    /** Margen, en minutos, por debajo del cual se penaliza la holgura. */
    public static final int UMBRAL_HOLGURA_MINUTOS = 120;

    private final EscenarioOperativo escenario;

    /**
     * @param escenario escenario operativo sobre el que se evalua
     */
    public EvaluadorFitness(EscenarioOperativo escenario) {
        this.escenario = escenario;
    }

    /**
     * Evalua la calidad de una solucion de ruteo y fija su fitness.
     *
     * @param solucion solucion candidata a evaluar
     * @return valor de fitness; a menor valor, mejor solucion
     */
    public double evaluar(SolucionRuteo solucion) {
        double distanciaTotal = 0.0;
        double penalizacionHolgura = 0.0;
        int incumplimientos = 0;
        for (Ruta ruta : solucion.getRutas()) {
            if (ruta.getSecuencia().isEmpty()) {
                continue;
            }
            ResultadoRuta resultado = evaluarRuta(ruta);
            distanciaTotal += resultado.distancia;
            incumplimientos += resultado.incumplimientos;
            penalizacionHolgura += resultado.penalizacionHolgura;
        }
        double penalizacionEspera = calcularPenalizacionEspera(solucion);
        double fitness = distanciaTotal
                + PESO_INCUMPLIMIENTO * incumplimientos * incumplimientos
                + PESO_ESPERA * penalizacionEspera
                + PESO_HOLGURA * penalizacionHolgura;
        solucion.setFitness(fitness);
        return fitness;
    }

    /**
     * Evalua una ruta: acumula distancia, incumplimientos y penalizacion de
     * holgura recorriendola con los tiempos reales.
     *
     * @param ruta ruta a evaluar
     * @return resultado parcial de la ruta
     */
    private ResultadoRuta evaluarRuta(Ruta ruta) {
        ResultadoRuta resultado = new ResultadoRuta();
        Nodo actual = ruta.getOrigen().getUbicacion();
        int reloj = escenario.getInstanteActual();
        int idVehiculo = ruta.getVehiculo().getId();
        for (Entrega entrega : ruta.getSecuencia()) {
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj);
            resultado.distancia += tramo;
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            int holgura = entrega.getHoraLimite() - reloj;
            if (holgura < 0) {
                resultado.incumplimientos++;
            } else if (holgura < UMBRAL_HOLGURA_MINUTOS) {
                double faltante = UMBRAL_HOLGURA_MINUTOS - holgura;
                resultado.penalizacionHolgura += faltante * faltante;
            }
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
        if (ruta.getDestino() != null) {
            resultado.distancia += CalculadoraTiempos.distancia(
                    escenario, actual, ruta.getDestino().getUbicacion(), reloj);
        }
        return resultado;
    }

    /** Piso de holgura restante, en minutos, para evitar dividir entre cero o valores negativos. */
    private static final int HOLGURA_RESTANTE_MINIMA = 1;

    /**
     * Penalizacion por entregas en espera, ponderada por la holgura restante
     * hasta su plazo (no por el plazo original del pedido): postergar una
     * entrega cuesta mas a medida que se acerca su vencimiento, de modo que la
     * presion por despacharla crece en cada ciclo de replanificacion en vez de
     * quedar fija mientras el pedido permanece huerfano en la cola.
     *
     * @param solucion solucion con su cola de espera
     * @return penalizacion total de espera
     */
    private double calcularPenalizacionEspera(SolucionRuteo solucion) {
        double penalizacion = 0.0;
        for (Entrega entrega : solucion.getEspera()) {
            int holguraRestante = entrega.getHoraLimite() - escenario.getInstanteActual();
            penalizacion += (double) escenario.getPlazoMaximo()
                    / Math.max(HOLGURA_RESTANTE_MINIMA, holguraRestante);
        }
        return penalizacion;
    }

    /**
     * Cuenta los incumplimientos de plazo de una solucion, sin evaluar fitness.
     *
     * @param solucion solucion a inspeccionar
     * @return numero de entregas que llegan despues de su hora limite
     */
    public int contarIncumplimientos(SolucionRuteo solucion) {
        int incumplimientos = 0;
        for (Ruta ruta : solucion.getRutas()) {
            incumplimientos += CalculadoraTiempos.recorrer(
                    escenario, ruta, escenario.getInstanteActual())[CalculadoraTiempos.INDICE_INCUMPLIMIENTOS];
        }
        return incumplimientos;
    }

    /**
     * Holgura minima de la solucion en minutos: el menor margen con que llega
     * una entrega respecto de su plazo.
     *
     * @param solucion solucion a inspeccionar
     * @return holgura minima en minutos
     */
    public int calcularHolguraMinima(SolucionRuteo solucion) {
        int minima = Integer.MAX_VALUE;
        for (Ruta ruta : solucion.getRutas()) {
            if (ruta.getSecuencia().isEmpty()) {
                continue;
            }
            int holgura = CalculadoraTiempos.recorrer(
                    escenario, ruta, escenario.getInstanteActual())[CalculadoraTiempos.INDICE_HOLGURA_MINIMA];
            if (holgura < minima) {
                minima = holgura;
            }
        }
        return minima == Integer.MAX_VALUE ? 0 : minima;
    }

    /**
     * Resultado parcial de evaluar una ruta.
     */
    private static final class ResultadoRuta {
        private double distancia = 0.0;
        private int incumplimientos = 0;
        private double penalizacionHolgura = 0.0;
    }
}
