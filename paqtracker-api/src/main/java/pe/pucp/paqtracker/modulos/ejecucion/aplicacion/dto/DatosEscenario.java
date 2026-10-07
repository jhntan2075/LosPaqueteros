package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Pedido;
import java.util.ArrayList;
import java.util.List;

/**
 * Datos de entrada de una ejecucion, en la linea de tiempo de la propia ejecucion.
 *
 * @param lineaTiempo     fecha del minuto cero
 * @param minutoInicial   minuto en el que arranca el reloj
 * @param horizonte       minuto en el que termina la ejecucion
 * @param pedidos         pedidos que llegaran durante la ejecucion
 * @param bloqueos        bloqueos programados
 * @param idMinimoLibre   primer identificador que pueden usar los pedidos registrados en vivo, ademas de
 *                        no chocar con los de {@code pedidos}
 */
public record DatosEscenario(LineaTiempo lineaTiempo, int minutoInicial, int horizonte, List<Pedido> pedidos,
                             List<Bloqueo> bloqueos, int idMinimoLibre) {

    /**
     * @param adicionales   pedidos a sumar (p. ej. recuperados tras un reinicio)
     * @param idMinimoLibre nuevo minimo de identificadores libres
     * @return copia con los pedidos sumados
     */
    public DatosEscenario conPedidos(List<Pedido> adicionales, int idMinimoLibre) {
        List<Pedido> todos = new ArrayList<>(pedidos);
        todos.addAll(adicionales);
        return new DatosEscenario(lineaTiempo, minutoInicial, horizonte, todos, bloqueos,
                Math.max(this.idMinimoLibre, idMinimoLibre));
    }
}
