package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AlmacenEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.ContextoInstantanea;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.ParadaPendiente;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.TramoEnCurso;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.UnidadEnMapa;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import pe.pucp.paqtracker.simulacion.UnidadEnTransito;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Construye la instantanea que se difunde a partir del estado de la simulacion. Se invoca en el hilo
 * del motor de la ejecucion, el unico que puede leer la simulacion.
 */
@Component
public class ConstructorInstantanea {

    /**
     * @param contexto   datos de la ejecucion (reloj, estado, pedidos e indicadores)
     * @param simulacion simulacion de la ejecucion
     * @return instantanea inmutable lista para difundir
     */
    public MensajeEstadoEjecucion construir(ContextoInstantanea contexto, SimulacionEnCurso simulacion) {
        double minuto = contexto.minutoSimulado();
        LineaTiempo lineaTiempo = contexto.lineaTiempo();
        Map<Integer, UnidadEnTransito> enTransito = new HashMap<>();
        for (UnidadEnTransito unidad : simulacion.getUnidadesEnTransito()) {
            enTransito.put(unidad.getVehiculo().getId(), unidad);
        }
        List<UnidadEnMapa> unidades = new ArrayList<>();
        for (Vehiculo vehiculo : simulacion.getFlota()) {
            unidades.add(construirUnidad(vehiculo, enTransito.get(vehiculo.getId()), minuto, lineaTiempo));
        }
        List<AlmacenEnMapa> almacenes = simulacion.getAlmacenes().stream().map(this::construirAlmacen).toList();
        return new MensajeEstadoEjecucion(contexto.ejecucionId(), contexto.tipoEscenario(), contexto.estado(),
                contexto.pasoSc(), lineaTiempo.aMilisegundos(minuto), lineaTiempo.formatear(minuto),
                LineaTiempo.formatear(contexto.relojReal()), contexto.factorAceleracion(), unidades, almacenes,
                contexto.pedidos(), contexto.indicadores());
    }

    /**
     * Calcula la posicion de una unidad. Si recorre un tramo, la interpola en forma de L (primero el eje
     * x, luego el y), que es un camino de Manhattan valido en la malla; si no, la ubica en su almacen.
     *
     * @param tramo  tramo en curso
     * @param minuto minuto simulado actual
     * @return posicion interpolada
     */
    static Coordenada interpolar(Tramo tramo, double minuto) {
        Nodo origen = tramo.getOrigen();
        Nodo destino = tramo.getDestino();
        double duracion = tramo.getLlegada() - tramo.getSalida();
        double avance = duracion <= 0 ? 1.0 : Math.min(1.0, Math.max(0.0, (minuto - tramo.getSalida()) / duracion));
        double dx = destino.getX() - origen.getX();
        double dy = destino.getY() - origen.getY();
        double total = Math.abs(dx) + Math.abs(dy);
        if (total == 0) {
            return new Coordenada(origen.getX(), origen.getY());
        }
        double recorrido = avance * total;
        if (recorrido <= Math.abs(dx)) {
            return new Coordenada(origen.getX() + Math.signum(dx) * recorrido, origen.getY());
        }
        return new Coordenada(destino.getX(), origen.getY() + Math.signum(dy) * (recorrido - Math.abs(dx)));
    }

    private UnidadEnMapa construirUnidad(Vehiculo vehiculo, UnidadEnTransito transito, double minuto,
                                         LineaTiempo lineaTiempo) {
        Coordenada ubicacion = coordenada(vehiculo.getPosicion().getUbicacion());
        TramoEnCurso tramoEnCurso = null;
        List<ParadaPendiente> paradas = new ArrayList<>();
        int carga = 0;
        if (transito != null) {
            Optional<Tramo> tramo = transito.tramoEnCurso((int) Math.floor(minuto));
            ubicacion = tramo.map(t -> interpolar(t, minuto))
                    .orElse(coordenada(transito.getDestino().getUbicacion()));
            tramoEnCurso = tramo.map(t -> construirTramo(t, lineaTiempo)).orElse(null);
            for (Tramo pendiente : transito.getTramos()) {
                if (pendiente.esEntrega() && pendiente.getLlegada() > minuto) {
                    carga += pendiente.getCantidad();
                    paradas.add(new ParadaPendiente(NomenclaturaOperacion.codigoPedido(pendiente.getIdPedido()),
                            coordenada(pendiente.getDestino()), pendiente.getCantidad(),
                            lineaTiempo.aMilisegundos(pendiente.getLlegada())));
                }
            }
        }
        return new UnidadEnMapa(vehiculo.getId(), NomenclaturaOperacion.codigoUnidad(vehiculo),
                NomenclaturaOperacion.tipoUnidad(vehiculo.getTipo()), vehiculo.getCapacidad(), carga,
                vehiculo.getTipo().getVelocidad(), vehiculo.getEstado().name(), ubicacion, tramoEnCurso, paradas);
    }

    private TramoEnCurso construirTramo(Tramo tramo, LineaTiempo lineaTiempo) {
        String pedido = tramo.getTipo() == TipoTramo.RETORNO ? null
                : NomenclaturaOperacion.codigoPedido(tramo.getIdPedido());
        return new TramoEnCurso(tramo.getTipo().name(), coordenada(tramo.getOrigen()),
                coordenada(tramo.getDestino()), lineaTiempo.aMilisegundos(tramo.getSalida()),
                lineaTiempo.aMilisegundos(tramo.getLlegada()), pedido);
    }

    private AlmacenEnMapa construirAlmacen(Almacen almacen) {
        Integer capacidad = almacen.esIlimitado() ? null : almacen.getCapacidadMaxima();
        Integer stock = almacen.esIlimitado() ? null : almacen.getStockDisponible();
        return new AlmacenEnMapa(almacen.getId(), NomenclaturaOperacion.codigoAlmacen(almacen),
                NomenclaturaOperacion.nombreAlmacen(almacen), coordenada(almacen.getUbicacion()), capacidad, stock,
                almacen.esIlimitado());
    }

    private static Coordenada coordenada(Nodo nodo) {
        return new Coordenada(nodo.getX(), nodo.getY());
    }
}
