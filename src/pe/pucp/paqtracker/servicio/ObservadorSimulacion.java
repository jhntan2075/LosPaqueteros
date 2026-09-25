package pe.pucp.paqtracker.servicio;

/**
 * Observador del avance de una simulacion dinamica. El orquestador lo invoca al
 * cerrar cada dia simulado, de modo que quien observa pueda tomar una
 * instantanea del estado acumulado sin interrumpir la corrida.
 *
 * Existe para el experimento numerico: el diseño exige medir el fitness
 * acumulado en los cortes de dia 1, dia 7 y dia 30 de una misma simulacion de
 * 30 dias, no de tres corridas independientes. Sin este punto de observacion el
 * orquestador solo entrega el agregado final y los tres horizontes dejarian de
 * ser cortes de la misma corrida.
 *
 * La simulacion no se detiene ni cambia de rumbo por lo que haga el observador.
 */
public interface ObservadorSimulacion {

    /**
     * Notifica el cierre de un dia simulado.
     *
     * @param dia             dia que acaba de cerrarse, empezando en 1
     * @param parcial         resultado acumulado hasta ese instante; es el mismo
     *                        objeto que sigue mutando, asi que quien observa debe
     *                        leer los valores que necesite en el acto
     * @param entregasEnCola  pedidos ingresados y aun no despachados al cerrar el dia
     */
    void alCerrarDia(int dia, ResultadoSimulacion parcial, int entregasEnCola);
}
