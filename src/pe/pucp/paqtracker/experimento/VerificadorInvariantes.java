package pe.pucp.paqtracker.experimento;

import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.planificador.comun.EvaluadorFitness;
import pe.pucp.paqtracker.planificador.comun.PesosFitness;
import java.util.ArrayList;
import java.util.List;

/**
 * Verificador ejecutable de las cuatro invariantes de diseño de la funcion
 * objetivo, para una combinacion cualquiera de pesos.
 *
 * Se ejecuta en cada combinacion probada durante la calibracion de la etapa 1:
 * una combinacion de pesos aparentemente razonable puede reintroducir la
 * inversion que motivo el rediseño de la funcion objetivo, en la que abandonar
 * una entrega salia mas barato que rutearla a tiempo.
 *
 * Termina con codigo de salida 0 si las cuatro invariantes se cumplen y 1 si
 * alguna falla, para poder encadenarlo en los barridos.
 *
 * Uso:
 *   java pe.pucp.paqtracker.experimento.VerificadorInvariantes \
 *        --peso-sin-rutear 10000 --peso-tardanza-base 5000
 */
public final class VerificadorInvariantes {

    /** Holgura minima del barrido, en minutos: un plazo maximo de retraso. */
    public static final int HOLGURA_MINIMA = -ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS;

    /** Holgura maxima del barrido, en minutos. */
    public static final int HOLGURA_MAXIMA = ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS;

    /** Tolerancia de la comprobacion de continuidad en el umbral. */
    private static final double TOLERANCIA_CONTINUIDAD = 1e-9;

    /**
     * Distancias representativas, en kilometros, con las que se comprueba que
     * rutear a tiempo cueste menos que abandonar. Cubren desde un reparto
     * vecino al almacen hasta la diagonal completa de la ciudad de 70 x 50.
     */
    private static final int[] DISTANCIAS_REPRESENTATIVAS = {1, 5, 15, 40, 80, 120};

    /**
     * Verifica las invariantes con los pesos indicados en la linea de comandos.
     *
     * @param args overrides de pesos, con las mismas opciones que el corredor
     */
    public static void main(String[] args) {
        PesosFitness pesos = leerPesos(args);
        List<Resultado> resultados = verificar(pesos);
        System.out.println("Pesos: " + pesos);
        boolean todoOk = true;
        for (Resultado resultado : resultados) {
            System.out.printf("%-8s %-46s %s%n", resultado.ok ? "OK" : "FALLA",
                    resultado.invariante, resultado.detalle);
            todoOk &= resultado.ok;
        }
        System.out.println(todoOk ? "Las cuatro invariantes se cumplen."
                : "Hay invariantes incumplidas: esta combinacion de pesos no es utilizable.");
        if (!todoOk) {
            System.exit(1);
        }
    }

    /**
     * Comprueba las cuatro invariantes de la funcion objetivo.
     *
     * @param pesos combinacion de pesos a verificar
     * @return un resultado por invariante, en el orden del diseño
     */
    public static List<Resultado> verificar(PesosFitness pesos) {
        List<Resultado> resultados = new ArrayList<>();
        resultados.add(verificarNoNegatividad(pesos));
        resultados.add(verificarContinuidad(pesos));
        resultados.add(verificarRamaBlandaPorDebajoDeLaDura(pesos));
        resultados.add(verificarRutearCuestaMenosQueAbandonar(pesos));
        return resultados;
    }

    /**
     * Invariante (a): el fitness nunca es negativo. Se barre toda la holgura
     * posible, desde un plazo maximo de retraso hasta un plazo maximo de
     * margen, y se exige que ni la penalizacion de tiempo ni la de cola bajen
     * de cero; como el fitness es la suma de esas dos con la distancia, que es
     * no negativa por construccion, basta con ellas.
     *
     * @param pesos combinacion de pesos a verificar
     * @return resultado de la invariante
     */
    private static Resultado verificarNoNegatividad(PesosFitness pesos) {
        for (int holgura = HOLGURA_MINIMA; holgura <= HOLGURA_MAXIMA; holgura++) {
            double tiempo = EvaluadorFitness.penalizacionTiempo(holgura, pesos);
            if (tiempo < 0.0) {
                return Resultado.falla("(a) fitness no negativo",
                        String.format("penalizacionTiempo(%d) = %.4f", holgura, tiempo));
            }
            double cola = penalizacionCola(pesos, holgura);
            if (cola < 0.0) {
                return Resultado.falla("(a) fitness no negativo",
                        String.format("penalizacionCola con holgura %d = %.4f", holgura, cola));
            }
        }
        return Resultado.ok("(a) fitness no negativo",
                String.format("barrido de holgura [%d, %d]", HOLGURA_MINIMA, HOLGURA_MAXIMA));
    }

    /**
     * Invariante (b): la penalizacion de tiempo es continua en h = U. Vale cero
     * justo en el umbral y el limite por la izquierda tiende a cero.
     *
     * @param pesos combinacion de pesos a verificar
     * @return resultado de la invariante
     */
    private static Resultado verificarContinuidad(PesosFitness pesos) {
        int umbral = pesos.getUmbralHolguraMinutos();
        double enUmbral = EvaluadorFitness.penalizacionTiempo(umbral, pesos);
        double justoDebajo = EvaluadorFitness.penalizacionTiempo(umbral - 1, pesos);
        double saltoDerecha = Math.abs(enUmbral);
        double saltoIzquierda = Math.abs(justoDebajo - pesos.getFactorHolguraBlanda());
        if (saltoDerecha > TOLERANCIA_CONTINUIDAD || saltoIzquierda > TOLERANCIA_CONTINUIDAD) {
            return Resultado.falla("(b) continuidad en h = U",
                    String.format("P(U) = %.9f, P(U-1) = %.9f, A = %.9f", enUmbral, justoDebajo,
                            pesos.getFactorHolguraBlanda()));
        }
        return Resultado.ok("(b) continuidad en h = U",
                String.format("P(U) = 0, P(U-1) = A = %.6f", pesos.getFactorHolguraBlanda()));
    }

    /**
     * Invariante (c): A * U^2 < H. El maximo de la rama blanda nunca alcanza el
     * salto fijo de la rama dura, de modo que proteger el margen de seguridad
     * jamas compita con cumplir el plazo.
     *
     * @param pesos combinacion de pesos a verificar
     * @return resultado de la invariante
     */
    private static Resultado verificarRamaBlandaPorDebajoDeLaDura(PesosFitness pesos) {
        double umbral = pesos.getUmbralHolguraMinutos();
        double blandaMaxima = pesos.getFactorHolguraBlanda() * umbral * umbral;
        double dura = pesos.getPenalizacionTardanzaBase();
        String detalle = String.format("A*U^2 = %.4f, H = %.4f", blandaMaxima, dura);
        return blandaMaxima < dura
                ? Resultado.ok("(c) A*U^2 < H", detalle)
                : Resultado.falla("(c) A*U^2 < H", detalle);
    }

    /**
     * Invariante (d): rutear una entrega a tiempo cuesta menos que abandonarla.
     * Se compara el peor caso de rutear a tiempo (la distancia recorrida mas el
     * maximo de la rama blanda, que es lo que cuesta llegar con holgura cero)
     * contra el mejor caso de abandonar (el piso C mas el termino de urgencia
     * con la holgura restante mas favorable, que es el plazo maximo).
     *
     * @param pesos combinacion de pesos a verificar
     * @return resultado de la invariante
     */
    private static Resultado verificarRutearCuestaMenosQueAbandonar(PesosFitness pesos) {
        double umbral = pesos.getUmbralHolguraMinutos();
        double blandaMaxima = pesos.getFactorHolguraBlanda() * umbral * umbral;
        double abandonoMinimo = penalizacionCola(pesos, ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS);
        for (int distancia : DISTANCIAS_REPRESENTATIVAS) {
            double rutearATiempo = distancia + blandaMaxima;
            if (rutearATiempo >= abandonoMinimo) {
                return Resultado.falla("(d) rutear a tiempo < abandonar",
                        String.format("con %d km: rutear = %.4f, abandonar = %.4f",
                                distancia, rutearATiempo, abandonoMinimo));
            }
        }
        return Resultado.ok("(d) rutear a tiempo < abandonar",
                String.format("peor caso %d km: %.4f < %.4f",
                        DISTANCIAS_REPRESENTATIVAS[DISTANCIAS_REPRESENTATIVAS.length - 1],
                        DISTANCIAS_REPRESENTATIVAS[DISTANCIAS_REPRESENTATIVAS.length - 1]
                                + blandaMaxima, abandonoMinimo));
    }

    /**
     * Replica la penalizacion de cola de una entrega abandonada, que en el
     * evaluador es privada porque depende del escenario.
     *
     * @param pesos           combinacion de pesos
     * @param holguraRestante minutos que faltan hasta el plazo de la entrega
     * @return penalizacion de dejar la entrega en la cola de espera
     */
    private static double penalizacionCola(PesosFitness pesos, int holguraRestante) {
        return pesos.getPenalizacionSinRutearBase()
                + pesos.getPesoEspera() * ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS
                / Math.max(1, holguraRestante);
    }

    /**
     * Lee los overrides de pesos de la linea de comandos, con las mismas
     * opciones que acepta el corredor del experimento.
     *
     * @param args argumentos de la invocacion
     * @return pesos a verificar
     */
    private static PesosFitness leerPesos(String[] args) {
        PesosFitness pesos = PesosFitness.porDefecto();
        for (int i = 0; i + 1 < args.length; i += 2) {
            String valor = args[i + 1];
            switch (args[i]) {
                case "--peso-umbral-holgura" -> pesos = pesos.conUmbralHolgura(Integer.parseInt(valor));
                case "--peso-factor-blanda" ->
                        pesos = pesos.conFactorHolguraBlanda(Double.parseDouble(valor));
                case "--peso-tardanza-base" ->
                        pesos = pesos.conPenalizacionTardanzaBase(Double.parseDouble(valor));
                case "--peso-minuto-tarde" ->
                        pesos = pesos.conPenalizacionPorMinutoTarde(Double.parseDouble(valor));
                case "--peso-sin-rutear" ->
                        pesos = pesos.conPenalizacionSinRutearBase(Double.parseDouble(valor));
                case "--peso-espera" -> pesos = pesos.conPesoEspera(Double.parseDouble(valor));
                default -> throw new IllegalArgumentException("Opcion desconocida: " + args[i]);
            }
        }
        return pesos;
    }

    /** Resultado de comprobar una invariante. */
    public static final class Resultado {
        private final String invariante;
        private final boolean ok;
        private final String detalle;

        private Resultado(String invariante, boolean ok, String detalle) {
            this.invariante = invariante;
            this.ok = ok;
            this.detalle = detalle;
        }

        private static Resultado ok(String invariante, String detalle) {
            return new Resultado(invariante, true, detalle);
        }

        private static Resultado falla(String invariante, String detalle) {
            return new Resultado(invariante, false, detalle);
        }

        public String getInvariante() {
            return invariante;
        }

        public boolean esOk() {
            return ok;
        }

        public String getDetalle() {
            return detalle;
        }
    }

    private VerificadorInvariantes() {
    }
}
