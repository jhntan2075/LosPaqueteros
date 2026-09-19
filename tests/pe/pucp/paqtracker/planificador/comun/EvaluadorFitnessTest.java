package pe.pucp.paqtracker.planificador.comun;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Entrega;
import pe.pucp.paqtracker.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Ruta;
import pe.pucp.paqtracker.modelo.SolucionRuteo;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modelo.Vehiculo;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas unitarias del EvaluadorFitness: el incumplimiento de plazo domina la
 * funcion objetivo y la cola de espera se penaliza.
 */
class EvaluadorFitnessTest {

    private static final int PLAZO_MAXIMO = 2160;
    private static final int TIEMPO_SERVICIO = 60;
    private static final Nodo DESTINO_LEJANO = new Nodo(65, 45);

    private final Almacen central = new Almacen(0, new Nodo(27, 14), true, Integer.MAX_VALUE);

    @Test
    void calcularFitness_pedidoVencido_retornaPenalizacion() {
        SolucionRuteo solucion = solucionConUnaEntrega(60);
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario());

        double fitness = evaluador.evaluar(solucion);

        assertEquals(1, evaluador.contarIncumplimientos(solucion));
        assertTrue(fitness >= EvaluadorFitness.PESO_INCUMPLIMIENTO);
    }

    @Test
    void calcularFitness_pedidoConPlazoHolgado_noPenalizaIncumplimiento() {
        SolucionRuteo solucion = solucionConUnaEntrega(PLAZO_MAXIMO);
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario());

        double fitness = evaluador.evaluar(solucion);

        assertEquals(0, evaluador.contarIncumplimientos(solucion));
        assertTrue(fitness < EvaluadorFitness.PESO_INCUMPLIMIENTO);
    }

    @Test
    void calcularFitness_entregaEnEspera_sumaPenalizacionDeEspera() {
        SolucionRuteo vacia = new SolucionRuteo();
        SolucionRuteo conEspera = new SolucionRuteo();
        conEspera.getEspera().add(new Entrega(0, 0, DESTINO_LEJANO, 4, 0, 240));
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario());

        assertTrue(evaluador.evaluar(conEspera) > evaluador.evaluar(vacia));
    }

    private SolucionRuteo solucionConUnaEntrega(int plazoMinutos) {
        // Bicicleta a 69 km del central: tarda mas de 5 horas en llegar.
        Ruta ruta = new Ruta(new Vehiculo(0, TipoVehiculo.BICICLETA, central), central);
        ruta.getSecuencia().add(new Entrega(0, 0, DESTINO_LEJANO, 4, 0, plazoMinutos));
        ruta.setDestino(central);
        SolucionRuteo solucion = new SolucionRuteo();
        solucion.getRutas().add(ruta);
        return solucion;
    }

    private EscenarioOperativo escenario() {
        return new EscenarioOperativo(List.of(central), List.of(), List.of(), 0,
                PLAZO_MAXIMO, null, TIEMPO_SERVICIO);
    }
}
