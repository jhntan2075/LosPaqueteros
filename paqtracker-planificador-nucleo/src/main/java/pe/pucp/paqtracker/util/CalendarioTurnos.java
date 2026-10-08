package pe.pucp.paqtracker.util;

import pe.pucp.paqtracker.modelo.ConfiguracionDominio;

/**
 * Aritmetica de turnos y refrigerio (LE-023/LE-024). Los turnos duran 8 horas
 * y empiezan a las 07:00, 15:00 y 23:00; al cambiar de turno la unidad debe
 * estar en un almacen. El refrigerio dura una hora y se escalona por grupos
 * segun el identificador de la unidad, siempre a mas de una hora de cualquier
 * cambio de turno.
 */
public final class CalendarioTurnos {

    private static final int MINUTOS_POR_DIA = 1440;

    /**
     * Minuto absoluto en que inicia el turno vigente en el instante dado.
     *
     * @param instante minuto absoluto a consultar
     * @return minuto absoluto de inicio del turno vigente
     */
    public static int turnoInicio(int instante) {
        int minutoDelDia = instante % MINUTOS_POR_DIA;
        int base = instante - minutoDelDia;
        int mejor = Integer.MIN_VALUE;
        for (int inicio : ConfiguracionDominio.iniciosTurno()) {
            if (inicio <= minutoDelDia && inicio > mejor) {
                mejor = inicio;
            }
        }
        if (mejor == Integer.MIN_VALUE) {
            // Antes del primer turno del dia: sigue el turno nocturno del dia anterior.
            int[] inicios = ConfiguracionDominio.iniciosTurno();
            return base - MINUTOS_POR_DIA + inicios[inicios.length - 1];
        }
        return base + mejor;
    }

    /**
     * Minuto absoluto en que termina el turno vigente en el instante dado.
     *
     * @param instante minuto absoluto a consultar
     * @return minuto absoluto de fin del turno vigente
     */
    public static int turnoFin(int instante) {
        return turnoInicio(instante) + ConfiguracionDominio.DURACION_TURNO_MINUTOS;
    }

    /**
     * Minuto absoluto en que termina el turno siguiente al vigente en el
     * instante dado (LE-incidencias, averia tipo 2).
     *
     * @param instante minuto absoluto a consultar
     * @return minuto absoluto de fin del turno siguiente
     */
    public static int finDelSiguienteTurno(int instante) {
        return turnoFin(instante) + ConfiguracionDominio.DURACION_TURNO_MINUTOS;
    }

    /**
     * Minuto absoluto de inicio del primer turno de 15:00 que ocurre en o
     * despues del instante dado (LE-incidencias, averia tipo 3).
     *
     * @param minimoInstante minuto absoluto a partir del cual buscar
     * @return minuto absoluto de inicio de ese turno
     */
    public static int proximoTurnoDeLasTres(int minimoInstante) {
        int inicioTurnoDeLasTres = ConfiguracionDominio.iniciosTurno()[1];
        int minutoDelDia = minimoInstante % MINUTOS_POR_DIA;
        int base = minimoInstante - minutoDelDia;
        if (minutoDelDia <= inicioTurnoDeLasTres) {
            return base + inicioTurnoDeLasTres;
        }
        return base + MINUTOS_POR_DIA + inicioTurnoDeLasTres;
    }

    /**
     * Minuto absoluto en que empieza el refrigerio del grupo de la unidad,
     * dentro del turno vigente en el instante dado.
     *
     * @param idVehiculo identificador de la unidad, que define su grupo
     * @param instante   minuto absoluto a consultar
     * @return minuto absoluto de inicio del refrigerio
     */
    public static int refrigerioInicio(int idVehiculo, int instante) {
        int grupo = Math.floorMod(idVehiculo, ConfiguracionDominio.GRUPOS_REFRIGERIO);
        return turnoInicio(instante) + ConfiguracionDominio.DESFASE_REFRIGERIO_MINUTOS
                + grupo * ConfiguracionDominio.PASO_REFRIGERIO_MINUTOS;
    }

    /**
     * Indica si la unidad esta en su refrigerio en el instante dado.
     *
     * @param idVehiculo identificador de la unidad
     * @param instante   minuto absoluto a consultar
     * @return verdadero si el instante cae dentro de la ventana de refrigerio
     */
    public static boolean enRefrigerio(int idVehiculo, int instante) {
        int inicio = refrigerioInicio(idVehiculo, instante);
        return inicio <= instante && instante < inicio + ConfiguracionDominio.MINUTOS_REFRIGERIO;
    }

    /**
     * Avanza el reloj de una unidad una duracion de trabajo efectivo, deteniendose
     * durante su refrigerio si el tramo lo cruza, o esperando a que termine si el
     * instante de partida ya cae dentro de el.
     *
     * @param idVehiculo identificador de la unidad
     * @param instante   minuto absoluto de inicio del tramo
     * @param duracion   duracion del tramo sin contar el refrigerio, en minutos
     * @return minuto absoluto en que termina el tramo, incluida la pausa si aplica
     */
    public static int avanzarConPausa(int idVehiculo, int instante, int duracion) {
        int inicioRefrigerio = refrigerioInicio(idVehiculo, instante);
        int t = instante;
        if (inicioRefrigerio <= t && t < inicioRefrigerio + ConfiguracionDominio.MINUTOS_REFRIGERIO) {
            t = inicioRefrigerio + ConfiguracionDominio.MINUTOS_REFRIGERIO;
            if (t < turnoFin(inicioRefrigerio)) {
                inicioRefrigerio = refrigerioInicio(idVehiculo, t);
            }
        }
        if (t < inicioRefrigerio && inicioRefrigerio < t + duracion) {
            return t + duracion + ConfiguracionDominio.MINUTOS_REFRIGERIO;
        }
        return t + duracion;
    }

    private CalendarioTurnos() {
    }
}
