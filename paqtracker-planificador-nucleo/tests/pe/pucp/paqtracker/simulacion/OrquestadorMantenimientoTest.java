package pe.pucp.paqtracker.simulacion;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.EstadoVehiculo;
import pe.pucp.paqtracker.modelo.MantenimientoProgramado;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.planificador.PlanificadorGA;
import pe.pucp.paqtracker.util.Malla;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas del mantenimiento preventivo en el orquestador: la unidad no se planifica en todo su dia de
 * taller, una unidad en ruta termina su ruta antes de entrar, y al dia siguiente vuelve a operar.
 */
class OrquestadorMantenimientoTest {

    private static final int SA_MINUTOS = 30;
    private static final long SEMILLA = 7L;
    private static final int MINUTOS_DIA = 1440;
    private static final int PLAZO_LARGO = 2 * MINUTOS_DIA;

    private final List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();

    @Test
    void unidadEnMantenimiento_noSeDespachaEnTodoSuDia_yVuelveAOperarAlDiaSiguiente() {
        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(almacenes.get(0), 1, 0, 0);
        Vehiculo auto = flota.get(0);
        Orquestador orquestador = orquestador(flota, List.of(new Pedido(1, new Nodo(30, 18), 3, 0, PLAZO_LARGO)));
        orquestador.fijarMantenimientos(List.of(new MantenimientoProgramado(auto.getId(), 0, MINUTOS_DIA)));
        SimulacionEnCurso simulacion = orquestador.iniciar(false);

        for (int instante = 0; instante < MINUTOS_DIA; instante += SA_MINUTOS) {
            ResultadoPaso paso = simulacion.avanzar(instante);
            assertTrue(paso.getUnidadesDespachadas().isEmpty(), "Se despacho en el taller en el minuto " + instante);
            assertEquals(EstadoVehiculo.EN_MANTENIMIENTO, auto.getEstado());
        }
        assertEquals(1, simulacion.getCola().size());

        int despachadas = 0;
        for (int instante = MINUTOS_DIA; instante < MINUTOS_DIA + 4 * 60 && despachadas == 0; instante += SA_MINUTOS) {
            despachadas = simulacion.avanzar(instante).getUnidadesDespachadas().size();
        }
        assertEquals(1, despachadas, "La unidad no volvio a operar al dia siguiente");
        assertTrue(simulacion.getCola().isEmpty());
    }

    @Test
    void unidadEnRutaAlEmpezarSuMantenimiento_terminaLaRutaYLuegoEntraAlTaller() {
        List<Vehiculo> flota = ConfiguracionDominio.crearFlota(almacenes.get(0), 1, 0, 0);
        Vehiculo auto = flota.get(0);
        Orquestador orquestador = orquestador(flota, List.of(new Pedido(1, new Nodo(30, 18), 3, 0, PLAZO_LARGO)));
        orquestador.fijarMantenimientos(List.of(new MantenimientoProgramado(auto.getId(), 1, MINUTOS_DIA)));
        SimulacionEnCurso simulacion = orquestador.iniciar(false);

        UnidadEnTransito transito = simulacion.avanzar(0).getUnidadesDespachadas().get(0);
        assertTrue(transito.getLibreEn() > 1, "La ruta debe seguir en curso al empezar el mantenimiento");
        int entregas = 0;
        int instante = SA_MINUTOS;
        for (; instante < transito.getLibreEn(); instante += SA_MINUTOS) {
            entregas += simulacion.avanzar(instante).getEntregasCompletadas().size();
            assertEquals(EstadoVehiculo.EN_RUTA, auto.getEstado());
        }
        entregas += simulacion.avanzar(instante).getEntregasCompletadas().size();

        assertEquals(1, entregas, "La unidad debe completar la entrega que llevaba");
        assertEquals(EstadoVehiculo.EN_MANTENIMIENTO, auto.getEstado());
        assertFalse(auto.estaDisponible());
    }

    @Test
    void fijarMantenimientos_deUnaUnidadInexistente_lanzaIllegalArgumentException() {
        Orquestador orquestador = orquestador(ConfiguracionDominio.crearFlota(almacenes.get(0), 1, 0, 0), List.of());

        assertThrows(IllegalArgumentException.class,
                () -> orquestador.fijarMantenimientos(List.of(new MantenimientoProgramado(999, 0, MINUTOS_DIA))));
    }

    @Test
    void ventanaSinDuracion_lanzaIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> new MantenimientoProgramado(0, 10, 10));
    }

    private Orquestador orquestador(List<Vehiculo> flota, List<Pedido> pedidos) {
        return new Orquestador(almacenes, flota, pedidos, List.of(), new Malla(), SA_MINUTOS,
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS, ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS,
                ConfiguracionDominio.PLAZO_DESPACHO_DIRECTO_MINUTOS, SEMILLA, PlanificadorGA::new);
    }
}
