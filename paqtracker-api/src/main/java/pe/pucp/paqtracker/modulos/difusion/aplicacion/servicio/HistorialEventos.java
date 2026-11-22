package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEventoEjecucion;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Historial en memoria de los eventos difundidos por cada ejecucion, para quien se conecta tarde (carga o
 * recarga de la pagina, reconexion): el canal STOMP solo entrega lo que ocurre despues de suscribirse.
 *
 * Cada ejecucion guarda dos cubetas acotadas, de modo que los eventos de rutina (pedidos nuevos, entregas,
 * replanificaciones) no desplacen a los importantes: al llenarse una cubeta se descarta su evento mas
 * antiguo. Es seguro entre hilos: el motor de cada ejecucion escribe desde el suyo y las peticiones HTTP leen
 * a la vez.
 */
@Component
public class HistorialEventos {

    /** Cuantos eventos importantes conserva cada ejecucion. */
    public static final int CAPACIDAD_IMPORTANTES = 500;
    /** Cuantos eventos de rutina conserva cada ejecucion. */
    public static final int CAPACIDAD_RUTINA = 300;
    /** Maximo de eventos que devuelve una consulta. */
    public static final int LIMITE_MAXIMO = CAPACIDAD_IMPORTANTES + CAPACIDAD_RUTINA;

    /** Tipos que se conservan en la cubeta de importantes; los demas son de rutina. */
    private static final Set<String> TIPOS_IMPORTANTES = Set.of("ALERTA_COLAPSO", "UNIDAD_AVERIADA", "TRASBORDO",
            "UNIDAD_REINCORPORADA", "BLOQUEO_INICIADO", "BLOQUEO_LEVANTADO", "STOCK_BAJO", "PEDIDO_TARDE",
            "EJECUCION_FINALIZADA");

    private final Map<String, Cubetas> porEjecucion = new ConcurrentHashMap<>();
    private final AtomicLong secuencia = new AtomicLong();

    /**
     * Guarda un evento en la cubeta que le corresponde por su tipo.
     *
     * @param evento evento ya difundido
     */
    public void registrar(MensajeEventoEjecucion evento) {
        Entrada entrada = new Entrada(secuencia.incrementAndGet(), evento);
        Cubetas cubetas = porEjecucion.computeIfAbsent(evento.ejecucionId(), id -> new Cubetas());
        if (TIPOS_IMPORTANTES.contains(evento.tipo())) {
            cubetas.importantes.agregar(entrada, CAPACIDAD_IMPORTANTES);
        } else {
            cubetas.rutina.agregar(entrada, CAPACIDAD_RUTINA);
        }
    }

    /**
     * @param ejecucionId ejecucion consultada
     * @param limite      maximo de eventos a devolver; se acota a {@link #LIMITE_MAXIMO}
     * @return eventos de ambas cubetas, del instante simulado mas reciente al mas antiguo (a igual instante,
     *         el ultimo registrado primero); vacia si la ejecucion es desconocida o nunca difundio eventos
     */
    public List<MensajeEventoEjecucion> consultar(String ejecucionId, int limite) {
        Cubetas cubetas = porEjecucion.get(ejecucionId);
        if (cubetas == null || limite <= 0) {
            return List.of();
        }
        List<Entrada> todas = new ArrayList<>(cubetas.importantes.copiar());
        todas.addAll(cubetas.rutina.copiar());
        todas.sort(Comparator.comparingLong((Entrada e) -> e.evento().timestampSimuladoMs())
                .thenComparingLong(Entrada::secuencia).reversed());
        return todas.stream().limit(Math.min(limite, LIMITE_MAXIMO)).map(Entrada::evento).toList();
    }

    /**
     * Libera el historial de una ejecucion.
     *
     * @param ejecucionId ejecucion descartada
     */
    public void olvidar(String ejecucionId) {
        porEjecucion.remove(ejecucionId);
    }

    private record Entrada(long secuencia, MensajeEventoEjecucion evento) {
    }

    private static final class Cubetas {
        private final Cubeta importantes = new Cubeta();
        private final Cubeta rutina = new Cubeta();
    }

    /** Cola acotada con acceso sincronizado. */
    private static final class Cubeta {
        private final ArrayDeque<Entrada> entradas = new ArrayDeque<>();

        synchronized void agregar(Entrada entrada, int capacidad) {
            entradas.addLast(entrada);
            while (entradas.size() > capacidad) {
                entradas.removeFirst();
            }
        }

        synchronized List<Entrada> copiar() {
            return new ArrayList<>(entradas);
        }
    }
}
