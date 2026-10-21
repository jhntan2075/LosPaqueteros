package pe.pucp.paqtracker.simulacion;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.TipoTramo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Tramo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import pe.pucp.paqtracker.util.Malla;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Pruebas del corte y la detencion de un recorrido en transito, que usan las averias.
 */
class UnidadEnTransitoTest {

    private static final int DETENCION = ConfiguracionDominio.AVERIA_TIPO1_MINUTOS;
    private static final int PLAZO = 2160;

    private final List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();
    private final Entrega primera = new Entrega(0, 1, new Nodo(37, 14), 2, 0, PLAZO);
    private final Entrega segunda = new Entrega(1, 2, new Nodo(37, 24), 3, 0, PLAZO);

    @Test
    void cortarEn_aMitadDelPrimerViaje_dejaTodoPendienteEnElPuntoExacto() {
        UnidadEnTransito transito = transito();
        Tramo viaje = transito.getTramos().get(0);
        int instante = (viaje.getSalida() + viaje.getLlegada()) / 2;

        UnidadEnTransito.Corte corte = transito.cortarEn(instante);

        assertEquals(List.of(primera, segunda), corte.entregasPendientes());
        assertEquals(viaje.ubicacionEn(instante), corte.ubicacion());
        assertEquals(viaje.kilometrosEn(instante), corte.kilometrosRecorridos());
        assertEquals(transito.getTramos().stream().mapToInt(Tramo::getDistancia).sum(), corte.kilometrosTotales());
    }

    @Test
    void cortarEn_duranteElServicioDeLaPrimera_laDaPorEntregada() {
        UnidadEnTransito transito = transito();
        Tramo servicio = transito.getTramos().get(1);

        UnidadEnTransito.Corte corte = transito.cortarEn(servicio.getSalida() + 1);

        assertEquals(List.of(segunda), corte.entregasPendientes());
        assertEquals(primera.getDestino(), corte.ubicacion());
    }

    @Test
    void detenerEn_aMitadDelPrimerViaje_intercalaLaDetencionYDesplazaElResto() {
        UnidadEnTransito transito = transito();
        Tramo viaje = transito.getTramos().get(0);
        int instante = (viaje.getSalida() + viaje.getLlegada()) / 2;

        UnidadEnTransito detenido = transito.detenerEn(instante, DETENCION);

        Tramo detencion = detenido.getTramos().get(1);
        assertEquals(TipoTramo.AVERIA, detencion.getTipo());
        assertEquals(instante, detencion.getSalida());
        assertEquals(instante + DETENCION, detencion.getLlegada());
        assertEquals(viaje.ubicacionEn(instante), detencion.getOrigen());
        assertEquals(transito.getLibreEn() + DETENCION, detenido.getLibreEn());
        assertEquals(llegadasDeEntrega(transito).stream().map(llegada -> llegada + DETENCION).toList(),
                llegadasDeEntrega(detenido));
        assertEquals(List.of(primera, segunda), detenido.cortarEn(instante).entregasPendientes());
    }

    @Test
    void detenerEn_alTerminarLaPrimeraEntrega_soloDesplazaLaSegunda() {
        UnidadEnTransito transito = transito();
        int llegadaPrimera = transito.getTramos().get(0).getLlegada();
        int finServicio = transito.getTramos().get(1).getLlegada();

        UnidadEnTransito detenido = transito.detenerEn(finServicio, DETENCION);

        assertEquals(List.of(llegadaPrimera, llegadasDeEntrega(transito).get(1) + DETENCION),
                llegadasDeEntrega(detenido));
        assertEquals(primera.getDestino(), detenido.getTramos().get(2).getOrigen());
    }

    @Test
    void llegadasPorEntrega_recorridoCompleto_asociaCadaEntregaASuLlegada() {
        UnidadEnTransito transito = transito();

        Map<Entrega, Integer> llegadas = transito.llegadasPorEntrega();

        assertEquals(llegadasDeEntrega(transito).get(0), llegadas.get(primera));
        assertEquals(llegadasDeEntrega(transito).get(1), llegadas.get(segunda));
    }

    @Test
    void tramosHasta_aMitadDelPrimerViaje_devuelveSoloLoRecorridoHastaElPunto() {
        UnidadEnTransito transito = transito();
        Tramo viaje = transito.getTramos().get(0);
        int instante = (viaje.getSalida() + viaje.getLlegada()) / 2;

        List<Tramo> recorridos = transito.tramosHasta(instante);

        assertEquals(1, recorridos.size());
        assertEquals(viaje.ubicacionEn(instante), recorridos.get(0).getDestino());
        assertEquals(instante, recorridos.get(0).getLlegada());
    }

    @Test
    void trazarDesde_sinEntregas_esSoloLaVueltaAlAlmacen() {
        Vehiculo moto = new Vehiculo(0, TipoVehiculo.MOTOCICLETA, almacenes.get(0));
        EscenarioOperativo escenario = new EscenarioOperativo(almacenes, List.of(moto), List.of(), 0, PLAZO,
                new Malla(), ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS);

        List<Tramo> tramos = CalculadoraTiempos.trazarDesde(escenario, moto, new Nodo(30, 18), List.of(),
                almacenes.get(0).getUbicacion(), 100);

        assertEquals(1, tramos.size());
        assertEquals(TipoTramo.RETORNO, tramos.get(0).getTipo());
        assertEquals(7, tramos.get(0).getDistancia());
        assertEquals(100, tramos.get(0).getSalida());
    }

    private UnidadEnTransito transito() {
        Vehiculo moto = new Vehiculo(0, TipoVehiculo.MOTOCICLETA, almacenes.get(0));
        Ruta ruta = new Ruta(moto, almacenes.get(0));
        ruta.getSecuencia().add(primera);
        ruta.getSecuencia().add(segunda);
        ruta.setDestino(almacenes.get(0));
        EscenarioOperativo escenario = new EscenarioOperativo(almacenes, List.of(moto), ruta.getSecuencia(), 0,
                PLAZO, new Malla(), ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS);
        int[] recorrido = CalculadoraTiempos.recorrer(escenario, ruta, 0);
        return new UnidadEnTransito(moto, ruta, 0, recorrido[CalculadoraTiempos.INDICE_FIN],
                CalculadoraTiempos.trazar(escenario, ruta, 0));
    }

    private static List<Integer> llegadasDeEntrega(UnidadEnTransito transito) {
        return transito.getTramos().stream().filter(Tramo::esEntrega).map(Tramo::getLlegada).toList();
    }
}
