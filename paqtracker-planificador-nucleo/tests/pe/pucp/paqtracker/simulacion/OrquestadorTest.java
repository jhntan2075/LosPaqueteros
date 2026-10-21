package pe.pucp.paqtracker.simulacion;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Averia;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.TipoAveria;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.util.Malla;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de las averias en el orquestador: reglas de cada tipo y correccion de stock y metricas al
 * liberar la carga, y decision de trasbordo del tipo 1. Un solo pedido a 7 km del central, para saber que
 * unidad lo lleva. Semilla fija.
 */
class OrquestadorTest {

    private static final int SA_MINUTOS = 30;
    private static final long SEMILLA = 7L;
    private static final int PLAZO_REGULAR = 2160;
    private static final int INSTANTE_AVERIA = 5;
    private static final int MINUTOS_DIA = 1440;

    private final List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();

    @Test
    void averiaTipo1_unidadEnRuta_conservaLaCargaYRetomaLaRutaDosHorasDespues() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(PLAZO_REGULAR));
        UnidadEnTransito transito = simulacion.avanzar(0).getUnidadesDespachadas().get(0);
        Vehiculo vehiculo = transito.getVehiculo();
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, vehiculo.getId(), TipoAveria.TIPO_1));

        ResultadoPaso paso = simulacion.avanzar(INSTANTE_AVERIA);

        AveriaAplicada aplicada = paso.getAveriasAplicadas().get(0);
        assertTrue(aplicada.entregasLiberadas().isEmpty());
        assertTrue(aplicada.trasbordos().isEmpty());
        assertTrue(aplicada.conservaCarga());
        assertEquals(transito.getLibreEn() + ConfiguracionDominio.AVERIA_TIPO1_MINUTOS,
                aplicada.transitoReanudado().getLibreEn());
        assertEquals(EstadoVehiculo.AVERIADA, vehiculo.getEstado());
        assertEquals(transito.ubicacionEn(INSTANTE_AVERIA), vehiculo.getUbicacionActual());
        assertTrue(simulacion.getUnidadesEnTransito().contains(aplicada.transitoReanudado()));
        assertFalse(paso.huboPlanificacion());
        assertEquals(AveriaAplicada.SIN_TRASLADO, aplicada.trasladoEn());
    }

    @Test
    void averiaTipo1_alCumplirseLasDosHoras_vuelveEnRutaYEntregaUnaSolaVezConRetraso() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(PLAZO_REGULAR));
        UnidadEnTransito transito = simulacion.avanzar(0).getUnidadesDespachadas().get(0);
        Vehiculo vehiculo = transito.getVehiculo();
        int llegadaOriginal = llegadaDeEntrega(transito);
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, vehiculo.getId(), TipoAveria.TIPO_1));
        simulacion.avanzar(INSTANTE_AVERIA);

        ResultadoPaso reincorporacion = simulacion.avanzar(INSTANTE_AVERIA + ConfiguracionDominio.AVERIA_TIPO1_MINUTOS);
        List<Tramo> entregas = new ArrayList<>(reincorporacion.getEntregasCompletadas());
        for (int instante = SA_MINUTOS * 5; instante <= MINUTOS_DIA; instante += SA_MINUTOS) {
            entregas.addAll(simulacion.avanzar(instante).getEntregasCompletadas());
        }

        assertEquals(List.of(vehiculo), reincorporacion.getUnidadesReincorporadas());
        assertEquals(1, entregas.size());
        assertEquals(llegadaOriginal + ConfiguracionDominio.AVERIA_TIPO1_MINUTOS, entregas.get(0).getLlegada());
        assertEquals(1, simulacion.getResultado().getTotalEntregas());
    }

    @Test
    void averiaTipo1_sinUnidadLibreQueLaRescate_sigueABordoCuentaElIncumplimientoYDeclaraElColapso() {
        List<Vehiculo> flota = List.of(new Vehiculo(0, TipoVehiculo.AUTO, almacenes.get(0)));
        SimulacionEnCurso simulacion = iniciar(flota, pedidoCercano(60));
        simulacion.avanzar(0);
        assertFalse(simulacion.huboColapso());
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, 0, TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(INSTANTE_AVERIA).getAveriasAplicadas().get(0);

        assertTrue(aplicada.trasbordos().isEmpty());
        assertTrue(aplicada.conservaCarga());
        ColapsoLogistico colapso = simulacion.getResultado().getColapso().orElseThrow();
        assertEquals(ColapsoLogistico.Causa.ENTREGA_TARDIA, colapso.getCausa());
        assertEquals(INSTANTE_AVERIA, colapso.getInstante());
        assertEquals(1, simulacion.getResultado().getTotalIncumplimientos());
    }

    @Test
    void averiaTipo1_entregaUrgente_laTrasbordaAUnaUnidadLibreQueLaEntregaATiempo() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(60));
        Vehiculo averiada = simulacion.avanzar(0).getUnidadesDespachadas().get(0).getVehiculo();
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, averiada.getId(), TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(INSTANTE_AVERIA).getAveriasAplicadas().get(0);

        Trasbordo trasbordo = aplicada.trasbordos().get(0);
        UnidadEnTransito receptora = trasbordo.receptora();
        assertNotSame(averiada, receptora.getVehiculo());
        assertEquals(EstadoVehiculo.EN_RUTA, receptora.getVehiculo().getEstado());
        assertEquals(TipoTramo.VIAJE_A_TRASBORDO, receptora.getTramos().get(0).getTipo());
        assertEquals(aplicada.ubicacion(), receptora.getTramos().get(0).getDestino());
        assertTrue(trasbordo.getRecojo() <= INSTANTE_AVERIA + ConfiguracionDominio.AVERIA_TIPO1_MINUTOS);
        assertTrue(llegadaDeEntrega(receptora) <= 60);
        assertFalse(aplicada.conservaCarga());
        assertFalse(simulacion.huboColapso());
        assertEquals(0, simulacion.getResultado().getTotalIncumplimientos());
        assertTrue(simulacion.getUnidadesEnTransito().contains(receptora));
    }

    @Test
    void averiaTipo1_trasbordoDeTodaLaCarga_laAveriadaVuelveAlAlmacenYLasMetricasCuentanAmbosRecorridos() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(60));
        Vehiculo averiada = simulacion.avanzar(0).getUnidadesDespachadas().get(0).getVehiculo();
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, averiada.getId(), TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(INSTANTE_AVERIA).getAveriasAplicadas().get(0);
        List<Tramo> entregas = new ArrayList<>();
        for (int instante = SA_MINUTOS; instante <= MINUTOS_DIA; instante += SA_MINUTOS) {
            entregas.addAll(simulacion.avanzar(instante).getEntregasCompletadas());
        }

        List<Tramo> vuelta = aplicada.transitoReanudado().getTramos();
        assertEquals(TipoTramo.RETORNO, vuelta.get(vuelta.size() - 1).getTipo());
        assertEquals(aplicada.ubicacion(), vuelta.get(vuelta.size() - 1).getOrigen());
        UnidadEnTransito receptora = aplicada.trasbordos().get(0).receptora();
        assertEquals(1, entregas.size());
        assertEquals(llegadaDeEntrega(receptora), entregas.get(0).getLlegada());
        ResultadoSimulacion resultado = simulacion.getResultado();
        assertEquals(1, resultado.getTotalEntregas());
        assertEquals(3, resultado.getProductosEntregados());
        assertEquals(kilometros(aplicada.transitoReanudado()) + kilometros(receptora), resultado.getDistanciaTotal());
        assertEquals(EstadoVehiculo.DISPONIBLE_EN_ALMACEN, averiada.getEstado());
    }

    @Test
    void averiaTipo1_holguraBajoElUmbralAunqueLlegueATiempo_tambienTrasborda() {
        // Plazo de 4 h: esperando las 2 h llega a tiempo, pero con menos de 120 min de holgura.
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(240));
        UnidadEnTransito transito = simulacion.avanzar(0).getUnidadesDespachadas().get(0);
        int holguraEsperando = 240 - llegadaDeEntrega(transito) - ConfiguracionDominio.AVERIA_TIPO1_MINUTOS;
        assertTrue(holguraEsperando >= 0 && holguraEsperando < 120);
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, transito.getVehiculo().getId(), TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(INSTANTE_AVERIA).getAveriasAplicadas().get(0);

        assertEquals(1, aplicada.trasbordos().size());
    }

    @Test
    void averiaTipo1_receptoraQueTambienLlegaTardePeroAntes_trasbordaIgual() {
        // Plazo de 10 min: la entrega ya salia tarde; la receptora no la salva, pero reduce el retraso.
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(10));
        Vehiculo averiada = simulacion.avanzar(0).getUnidadesDespachadas().get(0).getVehiculo();
        assertEquals(1, simulacion.getResultado().getTotalIncumplimientos());
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, averiada.getId(), TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(INSTANTE_AVERIA).getAveriasAplicadas().get(0);

        assertEquals(1, aplicada.trasbordos().size());
        assertTrue(llegadaDeEntrega(aplicada.trasbordos().get(0).receptora()) > 10);
        assertEquals(1, simulacion.getResultado().getTotalIncumplimientos());
    }

    @Test
    void averiaTipo1_receptoraQueNoAlcanzaElPuntoEnLasDosHoras_noTrasbordaYLaEntregaSigueABordo() {
        // La unica unidad libre es una bicicleta en el intermedio de (57, 27), a mas de 2 h del punto.
        List<Vehiculo> flota = List.of(new Vehiculo(0, TipoVehiculo.AUTO, almacenes.get(0)),
                new Vehiculo(1, TipoVehiculo.BICICLETA, almacenes.get(2)));
        SimulacionEnCurso simulacion = iniciar(flota, pedidoCercano(60));
        Vehiculo averiada = simulacion.avanzar(0).getUnidadesDespachadas().get(0).getVehiculo();
        assertEquals(0, averiada.getId());
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, 0, TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(INSTANTE_AVERIA).getAveriasAplicadas().get(0);

        assertTrue(aplicada.trasbordos().isEmpty());
        assertTrue(aplicada.conservaCarga());
        assertEquals(EstadoVehiculo.DISPONIBLE_EN_ALMACEN, flota.get(1).getEstado());
    }

    @Test
    void averiaTipo1_receptoraDeUnIntermedio_noDescuentaStockPorLaCargaTrasbordada() {
        Almacen intermedio = almacenes.get(1);
        List<Vehiculo> flota = List.of(new Vehiculo(0, TipoVehiculo.MOTOCICLETA, intermedio),
                new Vehiculo(1, TipoVehiculo.MOTOCICLETA, intermedio));
        Pedido pedido = new Pedido(1, new Nodo(14, 36), 3, 0, 60);
        SimulacionEnCurso simulacion = iniciar(flota, List.of(pedido));
        Vehiculo averiada = simulacion.avanzar(0).getUnidadesDespachadas().get(0).getVehiculo();
        simulacion.agregarAveria(new Averia(2, averiada.getId(), TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(2).getAveriasAplicadas().get(0);

        assertEquals(1, aplicada.trasbordos().size());
        assertEquals(intermedio.getCapacidadMaxima() - pedido.getCantidad(), intermedio.getStockDisponible());
    }

    @Test
    void averiaTipo1_unidadLibre_quedaEnSuAlmacenYSeReincorporaDisponible() {
        List<Vehiculo> flota = flotaEnCentral();
        Vehiculo libre = flota.get(1);
        SimulacionEnCurso simulacion = iniciar(flota, List.of());
        simulacion.avanzar(0);
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, libre.getId(), TipoAveria.TIPO_1));

        AveriaAplicada aplicada = simulacion.avanzar(INSTANTE_AVERIA).getAveriasAplicadas().get(0);
        assertNull(aplicada.transitoInterrumpido());
        assertEquals(almacenes.get(0).getUbicacion(), aplicada.ubicacion());
        assertEquals(EstadoVehiculo.AVERIADA, libre.getEstado());

        simulacion.avanzar(INSTANTE_AVERIA + ConfiguracionDominio.AVERIA_TIPO1_MINUTOS);
        assertEquals(EstadoVehiculo.DISPONIBLE_EN_ALMACEN, libre.getEstado());
    }

    @Test
    void averiaTipo2_unidadEnRuta_liberaLaCargaYOtraUnidadLaLlevaEnElMismoPaso() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(PLAZO_REGULAR));
        UnidadEnTransito transito = simulacion.avanzar(0).getUnidadesDespachadas().get(0);
        Vehiculo vehiculo = transito.getVehiculo();
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, vehiculo.getId(), TipoAveria.TIPO_2));

        ResultadoPaso paso = simulacion.avanzar(INSTANTE_AVERIA);

        AveriaAplicada aplicada = paso.getAveriasAplicadas().get(0);
        assertEquals(1, aplicada.entregasLiberadas().size());
        assertTrue(aplicada.entregasLiberadas().get(0).getId() < 0);
        assertEquals(transito.ubicacionEn(INSTANTE_AVERIA), aplicada.ubicacion());
        assertEquals(EstadoVehiculo.AVERIADA, vehiculo.getEstado());
        assertTrue(paso.huboPlanificacion());
        assertEquals(1, paso.getUnidadesDespachadas().size());
        assertNotSame(vehiculo, paso.getUnidadesDespachadas().get(0).getVehiculo());
        assertFalse(simulacion.getUnidadesEnTransito().stream().anyMatch(unidad -> unidad.getVehiculo() == vehiculo));
    }

    @Test
    void averiaTipo2_metricas_cuentanSoloLoRecorridoYLaEntregaUnaVez() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(PLAZO_REGULAR));
        UnidadEnTransito transito = simulacion.avanzar(0).getUnidadesDespachadas().get(0);
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, transito.getVehiculo().getId(), TipoAveria.TIPO_2));

        UnidadEnTransito reemplazo = simulacion.avanzar(INSTANTE_AVERIA).getUnidadesDespachadas().get(0);

        int recorridos = transito.cortarEn(INSTANTE_AVERIA).kilometrosRecorridos();
        int kilometrosReemplazo = kilometros(reemplazo);
        ResultadoSimulacion resultado = simulacion.getResultado();
        assertEquals(recorridos + kilometrosReemplazo, resultado.getDistanciaTotal());
        assertEquals(recorridos * costo(transito) + kilometrosReemplazo * costo(reemplazo), resultado.getCostoTotal(),
                1e-9);
        assertEquals(1, resultado.getTotalEntregas());
        assertEquals(3, resultado.getProductosEntregados());
    }

    @Test
    void averiaTipo2_salidaDesdeUnIntermedio_descuentaElStockUnaSolaVez() {
        Almacen intermedio = almacenes.get(1);
        List<Vehiculo> flota = List.of(new Vehiculo(0, TipoVehiculo.MOTOCICLETA, intermedio),
                new Vehiculo(1, TipoVehiculo.MOTOCICLETA, intermedio));
        Pedido pedido = new Pedido(1, new Nodo(14, 36), 3, 0, PLAZO_REGULAR);
        SimulacionEnCurso simulacion = iniciar(flota, List.of(pedido));
        UnidadEnTransito transito = simulacion.avanzar(0).getUnidadesDespachadas().get(0);
        assertEquals(intermedio, transito.getOrigen());
        simulacion.agregarAveria(new Averia(2, transito.getVehiculo().getId(), TipoAveria.TIPO_2));

        UnidadEnTransito reemplazo = simulacion.avanzar(2).getUnidadesDespachadas().get(0);

        assertEquals(intermedio, reemplazo.getOrigen());
        assertEquals(intermedio.getCapacidadMaxima() - pedido.getCantidad(), intermedio.getStockDisponible());
    }

    @Test
    void averiaTipo2_trasCuatroHoras_pasaAlCentralYVuelveAlFinDelTurnoSiguiente() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(PLAZO_REGULAR));
        Vehiculo vehiculo = simulacion.avanzar(0).getUnidadesDespachadas().get(0).getVehiculo();
        Averia averia = new Averia(INSTANTE_AVERIA, vehiculo.getId(), TipoAveria.TIPO_2);
        simulacion.agregarAveria(averia);
        simulacion.avanzar(INSTANTE_AVERIA);

        simulacion.avanzar(averia.getInstanteTraslado());
        assertEquals(almacenes.get(0), vehiculo.getPosicion());
        assertEquals(almacenes.get(0).getUbicacion(), vehiculo.getUbicacionActual());
        assertEquals(EstadoVehiculo.AVERIADA, vehiculo.getEstado());

        // La averia ocurre en el turno de 23:00 a 07:00; el siguiente termina a las 15:00.
        int reincorporacion = 15 * 60;
        simulacion.avanzar(reincorporacion - 1);
        assertEquals(EstadoVehiculo.AVERIADA, vehiculo.getEstado());
        ResultadoPaso paso = simulacion.avanzar(reincorporacion);
        assertEquals(EstadoVehiculo.DISPONIBLE_EN_ALMACEN, vehiculo.getEstado());
        assertEquals(List.of(vehiculo), paso.getUnidadesReincorporadas());
    }

    @Test
    void averiaTipo3_trasCuatroHoras_pasaAlCentralYVuelveEnElTurnoDeLasQuinceDosDiasDespues() {
        SimulacionEnCurso simulacion = iniciar(flotaEnCentral(), pedidoCercano(PLAZO_REGULAR));
        Vehiculo vehiculo = simulacion.avanzar(0).getUnidadesDespachadas().get(0).getVehiculo();
        Averia averia = new Averia(INSTANTE_AVERIA, vehiculo.getId(), TipoAveria.TIPO_3);
        simulacion.agregarAveria(averia);
        simulacion.avanzar(INSTANTE_AVERIA);

        simulacion.avanzar(averia.getInstanteTraslado());
        assertEquals(almacenes.get(0), vehiculo.getPosicion());

        int reincorporacion = 2 * MINUTOS_DIA + 15 * 60;
        simulacion.avanzar(reincorporacion - 1);
        assertEquals(EstadoVehiculo.AVERIADA, vehiculo.getEstado());
        simulacion.avanzar(reincorporacion);
        assertEquals(EstadoVehiculo.DISPONIBLE_EN_ALMACEN, vehiculo.getEstado());
    }

    @Test
    void averiaTipo2_entregaLiberadaQueNuncaSaleDeNuevo_cuentaComoIncumplidaAlCerrar() {
        List<Vehiculo> flota = List.of(new Vehiculo(0, TipoVehiculo.MOTOCICLETA, almacenes.get(0)));
        SimulacionEnCurso simulacion = iniciar(flota, pedidoCercano(60));
        simulacion.avanzar(0);
        simulacion.agregarAveria(new Averia(INSTANTE_AVERIA, 0, TipoAveria.TIPO_2));
        simulacion.avanzar(INSTANTE_AVERIA);

        simulacion.cerrar(SA_MINUTOS * 4);

        assertEquals(0, simulacion.getResultado().getTotalEntregas());
        assertEquals(1, simulacion.getResultado().getTotalIncumplimientos());
        assertEquals(ColapsoLogistico.Causa.PLAZO_VENCIDO_SIN_DESPACHO,
                simulacion.getResultado().getColapso().orElseThrow().getCausa());
    }

    @Test
    void constructor_averiaProgramadaSobreUnidadInexistente_lanzaIllegalArgumentException() {
        List<Averia> averias = List.of(new Averia(0, 999, TipoAveria.TIPO_1));

        assertThrows(IllegalArgumentException.class, () -> new Orquestador(almacenes, flotaEnCentral(), List.of(),
                averias, new Malla(), SA_MINUTOS, ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS, ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS,
                SEMILLA));
    }

    private SimulacionEnCurso iniciar(List<Vehiculo> flota, List<Pedido> pedidos) {
        return new Orquestador(almacenes, flota, pedidos, List.of(), new Malla(), SA_MINUTOS,
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS, ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS,
                ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS, SEMILLA, PlanificadorGA::new).iniciar(false);
    }

    private List<Vehiculo> flotaEnCentral() {
        return ConfiguracionDominio.crearFlota(almacenes.get(0), 1, 2, 0);
    }

    private static List<Pedido> pedidoCercano(int plazo) {
        return List.of(new Pedido(1, new Nodo(30, 18), 3, 0, plazo));
    }

    private static int llegadaDeEntrega(UnidadEnTransito transito) {
        return transito.getTramos().stream().filter(Tramo::esEntrega).findFirst().orElseThrow().getLlegada();
    }

    private static int kilometros(UnidadEnTransito transito) {
        return transito.getTramos().stream().mapToInt(Tramo::getDistancia).sum();
    }

    private static double costo(UnidadEnTransito transito) {
        return transito.getVehiculo().getTipo().getCostoPorKm();
    }
}
