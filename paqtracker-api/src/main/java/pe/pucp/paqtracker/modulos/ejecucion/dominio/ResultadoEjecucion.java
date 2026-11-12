package pe.pucp.paqtracker.modulos.ejecucion.dominio;

/**
 * Metricas del resultado de una ejecucion, tal como se guardan para el historial y la comparacion de
 * algoritmos. En el dia a dia se acumulan entre reinicios de la API ({@link #sumar}).
 *
 * @param entregas               entregas realizadas
 * @param incumplimientos        entregas fuera de plazo
 * @param entregasTarde          entregas previstas despues de su hora limite
 * @param distanciaKm            kilometros recorridos
 * @param costoTotal             costo de operacion (km por costo por km de cada tipo de unidad)
 * @param productosEntregados    paquetes despachados
 * @param productosFueraPlazo    paquetes entregados tarde
 * @param retrasoTotalMin        minutos de retraso sumados sobre las entregas tarde
 * @param retrasoPonderado       minutos de retraso por paquete, sumados
 * @param replanificaciones      ciclos del planificador
 * @param tiempoComputoMaxMs     tiempo de computo de la planificacion mas lenta
 * @param tiempoComputoTotalMs   tiempo de computo sumado
 * @param planificacionesMedidas planificaciones cuyo tiempo se midio
 * @param picoUnidades           mayor cantidad de unidades en ruta a la vez
 * @param usoAutos               rutas despachadas en auto
 * @param usoMotos               rutas despachadas en moto
 * @param usoBicicletas          rutas despachadas en bicicleta
 * @param averiasAtendidas       averias aplicadas
 */
public record ResultadoEjecucion(int entregas, int incumplimientos, int entregasTarde, double distanciaKm,
                                 double costoTotal, long productosEntregados, long productosFueraPlazo,
                                 long retrasoTotalMin, long retrasoPonderado, int replanificaciones,
                                 long tiempoComputoMaxMs, long tiempoComputoTotalMs, int planificacionesMedidas,
                                 int picoUnidades, int usoAutos, int usoMotos, int usoBicicletas,
                                 int averiasAtendidas) {

    /** Resultado de una ejecucion que aun no opero nada. */
    public static final ResultadoEjecucion VACIO = new ResultadoEjecucion(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0);

    /**
     * Suma dos tramos de una misma operacion: los contadores se suman y los maximos se comparan.
     *
     * @param otro resultado del tramo siguiente
     * @return resultado de ambos tramos
     */
    public ResultadoEjecucion sumar(ResultadoEjecucion otro) {
        return new ResultadoEjecucion(entregas + otro.entregas, incumplimientos + otro.incumplimientos,
                entregasTarde + otro.entregasTarde, distanciaKm + otro.distanciaKm, costoTotal + otro.costoTotal,
                productosEntregados + otro.productosEntregados, productosFueraPlazo + otro.productosFueraPlazo,
                retrasoTotalMin + otro.retrasoTotalMin, retrasoPonderado + otro.retrasoPonderado,
                replanificaciones + otro.replanificaciones, Math.max(tiempoComputoMaxMs, otro.tiempoComputoMaxMs),
                tiempoComputoTotalMs + otro.tiempoComputoTotalMs,
                planificacionesMedidas + otro.planificacionesMedidas, Math.max(picoUnidades, otro.picoUnidades),
                usoAutos + otro.usoAutos, usoMotos + otro.usoMotos, usoBicicletas + otro.usoBicicletas,
                averiasAtendidas + otro.averiasAtendidas);
    }

    /**
     * @param cantidad incumplimientos que se suman (pedidos que vencieron con la API detenida)
     * @return el mismo resultado con esos incumplimientos
     */
    public ResultadoEjecucion conIncumplimientos(int cantidad) {
        return sumar(new ResultadoEjecucion(0, cantidad, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
    }

    /**
     * @return tiempo de computo promedio por planificacion, o 0 si no hubo
     */
    public double tiempoComputoPromedioMs() {
        return planificacionesMedidas == 0 ? 0 : (double) tiempoComputoTotalMs / planificacionesMedidas;
    }
}
