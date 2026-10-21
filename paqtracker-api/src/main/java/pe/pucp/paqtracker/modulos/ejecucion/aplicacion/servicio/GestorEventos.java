package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.modelo.TipoAveria;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;

/**
 * Agenda de eventos de una ejecucion por instante simulado (hoy, las averias registradas en vivo). Quien
 * registra un evento solo lo encola; el motor los recibe al inicio de su siguiente salto Sc y recien ahi
 * cambian el estado de la simulacion. Asi el registro no compite con el paso en curso y el estado solo lo
 * toca el hilo del motor. Lo usa solo ese hilo.
 */
public final class GestorEventos {

    private final List<EventoAveria> averias = new ArrayList<>();

    /**
     * Averia registrada en vivo, a la espera de aplicarse.
     *
     * @param idVehiculo identificador de la unidad
     * @param tipo       severidad de la averia
     * @param instante   minuto simulado en que se registro
     */
    public record EventoAveria(int idVehiculo, TipoAveria tipo, int instante) {
    }

    /**
     * @param evento averia a encolar
     * @throws IllegalArgumentException si el evento es nulo
     */
    public void encolar(EventoAveria evento) {
        if (evento == null) {
            throw new IllegalArgumentException("El evento a encolar es nulo");
        }
        averias.add(evento);
        averias.sort(Comparator.comparingInt(EventoAveria::instante));
    }

    /**
     * @param idVehiculo identificador de la unidad
     * @return verdadero si la unidad tiene una averia encolada que aun no se entrega al motor
     */
    public boolean tieneAveriaPendiente(int idVehiculo) {
        return averias.stream().anyMatch(evento -> evento.idVehiculo() == idVehiculo);
    }

    /**
     * Entrega y retira los eventos cuyo instante ya llego.
     *
     * @param minuto minuto simulado actual
     * @return eventos vencidos, en orden de instante
     */
    public List<EventoAveria> entregarHasta(double minuto) {
        List<EventoAveria> vencidos = new ArrayList<>();
        Iterator<EventoAveria> iterador = averias.iterator();
        while (iterador.hasNext()) {
            EventoAveria evento = iterador.next();
            if (evento.instante() <= minuto) {
                vencidos.add(evento);
                iterador.remove();
            }
        }
        return vencidos;
    }
}
