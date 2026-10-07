package pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AlmacenEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.BloqueoEnMapa;
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

/**
 * Construye la instantanea que se difunde a partir del estado de la simulacion. Se invoca en el hilo
 * del motor de la ejecucion, el unico que puede leer la simulacion.
 */
@Component
public class ConstructorInstantanea {

    private static final double MILISEGUNDOS_POR_MINUTO = 60_000.0;
    private static final String NIVEL_VERDE = "VERDE";
    private static final String NIVEL_AMBAR = "AMBAR";
    private static final String NIVEL_ROJO = "ROJO";

    private final PropiedadesDominio.Semaforo semaforo;

    /**
     * @param propiedades parametros de la operacion, con los cortes del semaforo de inventario
     */
    public ConstructorInstantanea(PropiedadesDominio propiedades) {
        this.semaforo = propiedades.semaforo();
    }

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
            unidades.add(construirUnidad(vehiculo, enTransito.get(vehiculo.getId()), minuto, contexto));
        }
        List<AlmacenEnMapa> almacenes = simulacion.getAlmacenes().stream().map(this::construirAlmacen).toList();
        Long inicioReal = contexto.relojRealInicio() == null ? null : contexto.relojRealInicio().toEpochMilli();
        long transcurridoReal = inicioReal == null ? 0L
                : contexto.relojReal().toInstant().toEpochMilli() - inicioReal;
        return new MensajeEstadoEjecucion(contexto.ejecucionId(), contexto.tipoEscenario(), contexto.estado(),
                contexto.pasoSc(), lineaTiempo.aMilisegundos(minuto), lineaTiempo.formatear(minuto),
                lineaTiempo.aMilisegundos(contexto.minutoInicial()),
                Math.round((minuto - contexto.minutoInicial()) * MILISEGUNDOS_POR_MINUTO),
                LineaTiempo.formatear(contexto.relojReal()), inicioReal, transcurridoReal,
                contexto.factorAceleracion(), unidades, almacenes, contexto.pedidos(),
                bloqueosVigentes(simulacion.getBloqueos(), minuto, lineaTiempo), contexto.indicadores());
    }

    /**
     * Posicion de una unidad en su tramo: avance proporcional al tiempo sobre el camino real.
     *
     * @param tramo  tramo en curso
     * @param minuto minuto simulado actual
     * @return posicion interpolada
     */
    static Coordenada interpolar(Tramo tramo, double minuto) {
        return RecorridoCamino.posicion(tramo.getCamino(), avance(tramo, minuto));
    }

    /**
     * Ruta que le falta recorrer a una unidad: desde su posicion por el resto del tramo en curso y por
     * todos los tramos siguientes hasta el almacen de retorno.
     *
     * @param transito unidad en transito
     * @param minuto   minuto simulado actual
     * @return polilinea pendiente; vacia si ya termino su ruta
     */
    static List<Coordenada> rutaRestante(UnidadEnTransito transito, double minuto) {
        List<Coordenada> ruta = new ArrayList<>();
        for (Tramo tramo : transito.getTramos()) {
            if (tramo.getLlegada() <= minuto) {
                continue;
            }
            List<Coordenada> parte = RecorridoCamino.restante(tramo.getCamino(), avance(tramo, minuto));
            for (Coordenada punto : parte) {
                if (ruta.isEmpty() || !ruta.get(ruta.size() - 1).equals(punto)) {
                    ruta.add(punto);
                }
            }
        }
        return ruta;
    }

    private static double avance(Tramo tramo, double minuto) {
        double duracion = tramo.getLlegada() - tramo.getSalida();
        return duracion <= 0 ? 1.0 : (minuto - tramo.getSalida()) / duracion;
    }

    private UnidadEnMapa construirUnidad(Vehiculo vehiculo, UnidadEnTransito transito, double minuto,
                                         ContextoInstantanea contexto) {
        Coordenada ubicacion = RecorridoCamino.coordenada(vehiculo.getPosicion().getUbicacion());
        TramoEnCurso tramoEnCurso = null;
        List<Coordenada> rutaRestante = List.of();
        List<ParadaPendiente> paradas = new ArrayList<>();
        int carga = 0;
        if (transito != null) {
            Tramo tramo = transito.tramoEnCurso((int) Math.floor(minuto)).orElse(null);
            ubicacion = tramo == null ? RecorridoCamino.coordenada(transito.getDestino().getUbicacion())
                    : interpolar(tramo, minuto);
            tramoEnCurso = tramo == null ? null : construirTramo(tramo, contexto.lineaTiempo());
            rutaRestante = rutaRestante(transito, minuto);
            for (Tramo pendiente : transito.getTramos()) {
                if (pendiente.esEntrega() && pendiente.getLlegada() > minuto) {
                    carga += pendiente.getCantidad();
                    paradas.add(new ParadaPendiente(NomenclaturaOperacion.codigoPedido(pendiente.getIdPedido()),
                            RecorridoCamino.coordenada(pendiente.getDestino()), pendiente.getCantidad(),
                            contexto.lineaTiempo().aMilisegundos(pendiente.getLlegada())));
                }
            }
        }
        return new UnidadEnMapa(vehiculo.getId(), contexto.codigosFlota().codigo(vehiculo),
                NomenclaturaOperacion.tipoUnidad(vehiculo.getTipo()), vehiculo.getCapacidad(), carga,
                (double) carga / vehiculo.getCapacidad(), vehiculo.getTipo().getVelocidad(),
                vehiculo.getEstado().name(), ubicacion, tramoEnCurso, rutaRestante, paradas);
    }

    private TramoEnCurso construirTramo(Tramo tramo, LineaTiempo lineaTiempo) {
        String pedido = tramo.getTipo() == TipoTramo.RETORNO ? null
                : NomenclaturaOperacion.codigoPedido(tramo.getIdPedido());
        return new TramoEnCurso(tramo.getTipo().name(), RecorridoCamino.coordenada(tramo.getOrigen()),
                RecorridoCamino.coordenada(tramo.getDestino()), lineaTiempo.aMilisegundos(tramo.getSalida()),
                lineaTiempo.aMilisegundos(tramo.getLlegada()), pedido,
                tramo.getCamino().stream().map(RecorridoCamino::coordenada).toList());
    }

    private AlmacenEnMapa construirAlmacen(Almacen almacen) {
        if (almacen.esIlimitado()) {
            return new AlmacenEnMapa(almacen.getId(), NomenclaturaOperacion.codigoAlmacen(almacen),
                    NomenclaturaOperacion.nombreAlmacen(almacen),
                    RecorridoCamino.coordenada(almacen.getUbicacion()), null, null, true, null);
        }
        return new AlmacenEnMapa(almacen.getId(), NomenclaturaOperacion.codigoAlmacen(almacen),
                NomenclaturaOperacion.nombreAlmacen(almacen), RecorridoCamino.coordenada(almacen.getUbicacion()),
                almacen.getCapacidadMaxima(), almacen.getStockDisponible(), false, nivelInventario(almacen));
    }

    /**
     * Semaforo de inventario de un almacen intermedio: stock disponible como fraccion de su capacidad.
     */
    private String nivelInventario(Almacen almacen) {
        double fraccion = (double) almacen.getStockDisponible() / almacen.getCapacidadMaxima();
        if (fraccion < semaforo.inventarioRojo()) {
            return NIVEL_ROJO;
        }
        return fraccion < semaforo.inventarioAmbar() ? NIVEL_AMBAR : NIVEL_VERDE;
    }

    private static List<BloqueoEnMapa> bloqueosVigentes(List<Bloqueo> bloqueos, double minuto,
                                                        LineaTiempo lineaTiempo) {
        int instante = (int) Math.floor(minuto);
        List<BloqueoEnMapa> vigentes = new ArrayList<>();
        for (int i = 0; i < bloqueos.size(); i++) {
            Bloqueo bloqueo = bloqueos.get(i);
            if (bloqueo.estaVigente(instante)) {
                vigentes.add(new BloqueoEnMapa(i, bloqueo.getPolilinea().stream()
                        .map(RecorridoCamino::coordenada).toList(),
                        lineaTiempo.aMilisegundos(bloqueo.getInstanteInicio()),
                        lineaTiempo.aMilisegundos(bloqueo.getInstanteFin())));
            }
        }
        return vigentes;
    }
}
