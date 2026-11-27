package pe.pucp.paqtracker.modulos.planificacion.aplicacion.servicio;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.ParametrosDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.SolicitudPreparacionSimulacion;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.VentanaMantenimiento;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import pe.pucp.paqtracker.simulacion.SimulacionEnCurso;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * El mantenimiento de la unidad TM02 del archivo cae sobre la M-02 de la flota de la ejecucion, y los de
 * unidades que la flota elegida no tiene se ignoran.
 */
class ServicioPlanificacionMantenimientoTest {

    private static final int MINUTOS_DIA = 1440;

    @Test
    void prepararSimulacion_ubicaCadaMantenimientoEnLaUnidadDeEseTipoYNumero() {
        List<VentanaMantenimiento> ventanas = List.of(
                new VentanaMantenimiento(TipoVehiculo.MOTOCICLETA, 2, 0, MINUTOS_DIA),
                new VentanaMantenimiento(TipoVehiculo.AUTO, 9, 0, MINUTOS_DIA),
                new VentanaMantenimiento(TipoVehiculo.BICICLETA, 1, MINUTOS_DIA, 2 * MINUTOS_DIA));
        SimulacionEnCurso simulacion = new ServicioPlanificacion(new FabricaAlgoritmo()).prepararSimulacion(
                new SolicitudPreparacionSimulacion(List.of(), List.of(), AlgoritmoPlanificacion.GA, 1L, 30, false,
                        new ComposicionFlota(1, 3, 1), ParametrosDominio.porDefecto(), ventanas));

        simulacion.avanzar(0);

        List<Vehiculo> motos = simulacion.getFlota().stream()
                .filter(v -> v.getTipo() == TipoVehiculo.MOTOCICLETA).toList();
        assertEquals(EstadoVehiculo.EN_MANTENIMIENTO, motos.get(1).getEstado());
        assertEquals(1, simulacion.getFlota().stream()
                .filter(v -> v.getEstado() == EstadoVehiculo.EN_MANTENIMIENTO).count());
        Vehiculo bicicleta = simulacion.getFlota().stream()
                .filter(v -> v.getTipo() == TipoVehiculo.BICICLETA).findFirst().orElseThrow();
        simulacion.avanzar(MINUTOS_DIA);
        assertEquals(EstadoVehiculo.EN_MANTENIMIENTO, bicicleta.getEstado());
        assertEquals(EstadoVehiculo.DISPONIBLE_EN_ALMACEN, motos.get(1).getEstado());
    }
}
