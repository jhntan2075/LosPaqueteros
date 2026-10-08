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
 * La unidad del dominio es el producto, no el pedido: la capacidad de la flota,
 * el stock de los almacenes y las restricciones duras se miden en productos, de
 * modo que un pedido de 40 unidades no puede pesar lo mismo que uno de 1. Los
 * terminos que representan un costo consumado escalan con la cantidad; los que
 * representan un evento binario del pedido, no.
 *
 * El tiempo se trata con una sola penalizacion por entrega, continua en el
 * umbral y monotona no creciente en la holgura h = horaLimite - llegada:
 *
 *   h >= UMBRAL            -> 0
 *   0 <= h <  UMBRAL       -> FACTOR_HOLGURA_BLANDA * (UMBRAL - h)^2
 *   h <  0                 -> PENALIZACION_TARDANZA_BASE
 *                             + PENALIZACION_POR_MINUTO_TARDE * productos * (-h)
 *
 * La cola escala por completo con la cantidad, porque abandonar un pedido deja
 * sin atender a todos sus productos:
 *
 *   P_cola(e) = productos(e) * (PENALIZACION_SIN_RUTEAR_BASE
 *                               + PESO_ESPERA * plazoMaximo / holguraRestante)
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

    /** Cantidad de producto con la que se comprueban las invariantes en su peor caso. */
    private static final int PRODUCTO_UNICO = 1;

    private final EscenarioOperativo escenario;
    private final PesosFitness pesos;
    private final ContadorEvaluaciones contador;

    /**
     * Crea un evaluador con los pesos de produccion.
     *
     * @param escenario escenario operativo sobre el que se evalua
     */
    public EvaluadorFitness(EscenarioOperativo escenario) {
        this(escenario, PesosFitness.porDefecto());
    }

    /**
     * Crea un evaluador con pesos explicitos. Lo usa la calibracion del
     * experimento numerico para barrer un peso a la vez sin recompilar.
     *
     * @param escenario escenario operativo sobre el que se evalua
     * @param pesos     pesos de la funcion objetivo
     */
    public EvaluadorFitness(EscenarioOperativo escenario, PesosFitness pesos) {
        this(escenario, pesos, new ContadorEvaluaciones());
    }

    /**
     * Crea un evaluador que registra cada evaluacion en el contador indicado.
     *
     * @param escenario escenario operativo sobre el que se evalua
     * @param pesos     pesos de la funcion objetivo
     * @param contador  contador de evaluaciones de la simulacion
     */
    public EvaluadorFitness(EscenarioOperativo escenario, PesosFitness pesos,
                            ContadorEvaluaciones contador) {
        this.escenario = escenario;
        this.pesos = pesos;
        this.contador = contador;
    }

    /**
     * @return pesos con los que evalua este evaluador
     */
    public PesosFitness getPesos() {
        return pesos;
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
        contador.registrar();
        return fitness;
    }

    /**
     * Penalizacion de tiempo de una entrega de un solo producto, con los pesos
     * de produccion.
     *
     * @param holgura minutos entre la llegada y la hora limite; negativa si llega tarde
     * @return penalizacion de tiempo de la entrega
     */
    public static double penalizacionTiempo(int holgura) {
        return penalizacionTiempo(holgura, PRODUCTO_UNICO, PesosFitness.porDefecto());
    }

    /**
     * Penalizacion de tiempo de una entrega de un solo producto, con pesos
     * explicitos. Es la forma con la que el verificador comprueba las
     * invariantes en su peor caso: con un producto, la rama dura vale lo minimo
     * posible frente a la blanda.
     *
     * @param holgura minutos entre la llegada y la hora limite; negativa si llega tarde
     * @param pesos   pesos de la funcion objetivo
     * @return penalizacion de tiempo de la entrega
     */
    public static double penalizacionTiempo(int holgura, PesosFitness pesos) {
        return penalizacionTiempo(holgura, PRODUCTO_UNICO, pesos);
    }

    /**
     * Penalizacion de tiempo de una entrega segun su holgura y su cantidad de
     * producto. Es continua en el umbral, monotona no creciente en la holgura y
     * nunca negativa.
     *
     * Solo el costo por minuto escala con la cantidad: incumplir es un evento
     * binario del pedido que declara el colapso logistico (LE-067), asi que el
     * salto fijo no se multiplica, mientras que la magnitud del retraso si
     * afecta a tantos productos como transporte la entrega. La rama blanda
     * tampoco escala: protege la holgura, no mide un costo consumado.
     *
     * @param holgura   minutos entre la llegada y la hora limite; negativa si llega tarde
     * @param productos unidades de producto de la entrega
     * @param pesos     pesos de la funcion objetivo
     * @return penalizacion de tiempo de la entrega
     */
    public static double penalizacionTiempo(int holgura, int productos, PesosFitness pesos) {
        if (holgura >= pesos.getUmbralHolguraMinutos()) {
            return 0.0;
        }
        if (holgura >= 0) {
            double faltante = pesos.getUmbralHolguraMinutos() - holgura;
            return pesos.getFactorHolguraBlanda() * faltante * faltante;
        }
        return pesos.getPenalizacionTardanzaBase()
                + pesos.getPenalizacionPorMinutoTarde() * productos * (-holgura);
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
            int tramo = CalculadoraTiempos.distancia(escenario, actual, entrega.getDestino(), reloj,
                    ruta.getVehiculo());
            resultado.distancia += tramo;
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj,
                    CalculadoraTiempos.minutosDeViaje(tramo, ruta.getVehiculo().getTipo()));
            resultado.penalizacionTiempo += penalizacionTiempo(entrega.getHoraLimite() - reloj,
                    entrega.getCantidad(), pesos);
            reloj = CalendarioTurnos.avanzarConPausa(idVehiculo, reloj, escenario.getTiempoServicio());
            actual = entrega.getDestino();
        }
        if (ruta.getDestino() != null) {
            resultado.distancia += CalculadoraTiempos.distancia(
                    escenario, actual, ruta.getDestino().getUbicacion(), reloj, ruta.getVehiculo());
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
     * Los dos terminos escalan con la cantidad de producto: abandonar deja sin
     * atender a todas las unidades del pedido, de modo que un pedido grande en
     * cola cuesta proporcionalmente mas que uno pequeño.
     *
     * @param solucion solucion con su cola de espera
     * @return penalizacion total de la cola de espera
     */
    private double calcularPenalizacionCola(SolucionRuteo solucion) {
        double penalizacion = 0.0;
        for (Entrega entrega : solucion.getEspera()) {
            int holguraRestante = entrega.getHoraLimite() - escenario.getInstanteActual();
            double porProducto = pesos.getPenalizacionSinRutearBase()
                    + pesos.getPesoEspera() * escenario.getPlazoMaximo()
                    / Math.max(HOLGURA_RESTANTE_MINIMA, holguraRestante);
            penalizacion += porProducto * entrega.getCantidad();
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
