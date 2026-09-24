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
 *         + suma(penalizacionTiempo(holgura)) sobre las entregas ruteadas
 *         + suma(penalizacionCola) sobre las entregas sin rutear
 *
 * El tiempo se trata con una sola penalizacion por entrega, continua en el
 * umbral y monotona no creciente en la holgura h = horaLimite - llegada:
 *
 *   h >= UMBRAL            -> 0
 *   0 <= h <  UMBRAL       -> FACTOR_HOLGURA_BLANDA * (UMBRAL - h)^2
 *   h <  0                 -> PENALIZACION_TARDANZA_BASE
 *                             + PENALIZACION_POR_MINUTO_TARDE * (-h)
 *
 * La version anterior sumaba dos terminos separados, uno por el conteo de
 * tardios al cuadrado y otro por la holgura, y quedaba invertida: llegar justo
 * a tiempo costaba mas que llegar tarde, de modo que dejar la entrega en la
 * cola salia mas barato que rutearla. El conteo binario de tardios sobrevive
 * solo como criterio duro de aceptacion y colapso, en
 * {@link #contarIncumplimientos(SolucionRuteo)}, fuera de la busqueda.
 *
 * La distancia es el costo operativo base. La capacidad y el stock no aparecen
 * aqui: son restricciones duras que el reparador garantiza antes de evaluar,
 * porque siempre son reparables.
 *
 * Este bloque es compartido por todos los algoritmos metaheuristicos y no debe
 * duplicarse ni modificarse localmente.
 */
public final class EvaluadorFitness {

    // --- Parametros calibrables de la penalizacion de tiempo. Valores de
    // --- arranque provisionales (23-09-2026), pendientes de calibrar sobre
    // --- meses completos. Deben mantener FACTOR_HOLGURA_BLANDA * UMBRAL^2
    // --- <= PENALIZACION_TARDANZA_BASE para que la rama blanda nunca supere
    // --- a la dura.

    /** Margen, en minutos, por debajo del cual se protege la holgura. */
    public static final int UMBRAL_HOLGURA_MINUTOS = 120;

    /**
     * Factor de la rama blanda. Con el umbral en 120 minutos, su maximo es
     * 0,007 * 120^2 = 100,8: del orden de una distancia, para que proteger la
     * holgura nunca compita con cumplir el plazo.
     */
    public static final double FACTOR_HOLGURA_BLANDA = 0.007;

    /** Salto fijo al incumplir el plazo, independiente de cuanto se tarde. */
    public static final double PENALIZACION_TARDANZA_BASE = 5000.0;

    /** Costo de cada minuto de retraso; da gradiente para reducir el retraso. */
    public static final double PENALIZACION_POR_MINUTO_TARDE = 50.0;

    /**
     * Piso de dejar una entrega sin rutear. Abandonar un pedido debe costar
     * mas que rutearlo a tiempo aunque sea con margen ajustado.
     */
    public static final double PENALIZACION_SIN_RUTEAR_BASE = 5000.0;

    /** Peso de la urgencia de una entrega en espera, sobre el piso anterior. */
    public static final double PESO_ESPERA = 50.0;

    /** Piso de holgura restante, en minutos, para evitar dividir entre cero o valores negativos. */
    private static final int HOLGURA_RESTANTE_MINIMA = 1;

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
        double penalizacionTiempo = 0.0;
        for (Ruta ruta : solucion.getRutas()) {
            if (ruta.getSecuencia().isEmpty()) {
                continue;
            }
            ResultadoRuta resultado = evaluarRuta(ruta);
            distanciaTotal += resultado.distancia;
            penalizacionTiempo += resultado.penalizacionTiempo;
        }
        double fitness = distanciaTotal + penalizacionTiempo + calcularPenalizacionCola(solucion);
        solucion.setFitness(fitness);
        return fitness;
    }

    /**
     * Penalizacion de tiempo de una entrega segun su holgura. Es continua en el
     * umbral, monotona no creciente en toda la holgura y nunca negativa.
     *
     * @param holgura minutos entre la llegada y la hora limite; negativa si llega tarde
     * @return penalizacion de tiempo de la entrega
     */
    public static double penalizacionTiempo(int holgura) {
        if (holgura >= UMBRAL_HOLGURA_MINUTOS) {
            return 0.0;
        }
        if (holgura >= 0) {
            double faltante = UMBRAL_HOLGURA_MINUTOS - holgura;
            return FACTOR_HOLGURA_BLANDA * faltante * faltante;
        }
        return PENALIZACION_TARDANZA_BASE + PENALIZACION_POR_MINUTO_TARDE * (-holgura);
    }

    /**
     * Evalua una ruta: acumula distancia y penalizacion de tiempo
     * recorriendola con los tiempos reales.
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
            resultado.penalizacionTiempo += penalizacionTiempo(entrega.getHoraLimite() - reloj);
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
        if (ruta.getDestino() != null) {
            resultado.distancia += CalculadoraTiempos.distancia(
                    escenario, actual, ruta.getDestino().getUbicacion(), reloj);
        }
        return resultado;
    }

    /**
     * Penalizacion por entregas sin rutear. Cada una paga un piso fijo, para
     * que abandonarla salga mas caro que rutearla a tiempo, mas un termino
     * ponderado por la holgura restante hasta su plazo (no por el plazo
     * original del pedido): postergar una entrega cuesta mas a medida que se
     * acerca su vencimiento, de modo que la presion por despacharla crece en
     * cada ciclo de replanificacion en vez de quedar fija mientras el pedido
     * permanece huerfano en la cola.
     *
     * @param solucion solucion con su cola de espera
     * @return penalizacion total de la cola de espera
     */
    private double calcularPenalizacionCola(SolucionRuteo solucion) {
        double penalizacion = 0.0;
        for (Entrega entrega : solucion.getEspera()) {
            int holguraRestante = entrega.getHoraLimite() - escenario.getInstanteActual();
            penalizacion += PENALIZACION_SIN_RUTEAR_BASE + PESO_ESPERA * escenario.getPlazoMaximo()
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
        private double penalizacionTiempo = 0.0;
    }
}
