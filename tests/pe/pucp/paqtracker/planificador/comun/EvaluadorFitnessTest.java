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
 * Pruebas unitarias del EvaluadorFitness. Cubren la forma de la penalizacion de
 * tiempo y las invariantes que la sostienen: nunca negativa, continua en el
 * umbral, monotona no creciente en la holgura, y siempre mas barata que dejar
 * la entrega sin rutear cuando se puede llegar a tiempo.
 */
class EvaluadorFitnessTest {

    private static final int PLAZO_MAXIMO = 2160;
    private static final int TIEMPO_SERVICIO = 60;
    private static final int UMBRAL = EvaluadorFitness.UMBRAL_HOLGURA_MINUTOS;
    private static final Nodo DESTINO_LEJANO = new Nodo(65, 45);
    private static final Nodo DESTINO_CERCANO = new Nodo(40, 30);

    private final Almacen central = new Almacen(0, new Nodo(27, 14), true, Integer.MAX_VALUE);

    @Test
    void calcularFitness_pedidoVencido_retornaPenalizacion() {
        SolucionRuteo solucion = solucionConUnaEntrega(60, DESTINO_LEJANO, TipoVehiculo.BICICLETA);
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario());

        double fitness = evaluador.evaluar(solucion);

        assertEquals(1, evaluador.contarIncumplimientos(solucion));
        assertTrue(fitness >= EvaluadorFitness.PENALIZACION_TARDANZA_BASE);
    }

    @Test
    void calcularFitness_pedidoConPlazoHolgado_noPenalizaTiempo() {
        SolucionRuteo solucion = solucionConUnaEntrega(PLAZO_MAXIMO, DESTINO_LEJANO, TipoVehiculo.BICICLETA);
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario());

        double fitness = evaluador.evaluar(solucion);

        assertEquals(0, evaluador.contarIncumplimientos(solucion));
        assertTrue(fitness < EvaluadorFitness.PENALIZACION_TARDANZA_BASE);
    }

    @Test
    void penalizacionTiempo_todoElDominio_nuncaEsNegativa() {
        for (int holgura = -PLAZO_MAXIMO; holgura <= PLAZO_MAXIMO; holgura++) {
            assertTrue(EvaluadorFitness.penalizacionTiempo(holgura) >= 0.0, "holgura " + holgura);
        }
    }

    @Test
    void penalizacionTiempo_enElUmbral_esContinuaYValeCero() {
        assertEquals(0.0, EvaluadorFitness.penalizacionTiempo(UMBRAL));
        assertEquals(0.0, EvaluadorFitness.penalizacionTiempo(UMBRAL + 1));
        double justoDebajo = EvaluadorFitness.penalizacionTiempo(UMBRAL - 1);
        assertTrue(justoDebajo > 0.0 && justoDebajo < 1.0, "salto en el umbral: " + justoDebajo);
    }

    @Test
    void penalizacionTiempo_alCrecerLaHolgura_esMonotonaNoCreciente() {
        double anterior = EvaluadorFitness.penalizacionTiempo(-PLAZO_MAXIMO);
        for (int holgura = -PLAZO_MAXIMO + 1; holgura <= PLAZO_MAXIMO; holgura++) {
            double actual = EvaluadorFitness.penalizacionTiempo(holgura);
            assertTrue(actual <= anterior, "sube en holgura " + holgura);
            anterior = actual;
        }
    }

    @Test
    void penalizacionTiempo_ramaBlanda_nuncaSuperaALaDura() {
        double blandaMaxima = EvaluadorFitness.FACTOR_HOLGURA_BLANDA * UMBRAL * UMBRAL;
        assertTrue(blandaMaxima < EvaluadorFitness.PENALIZACION_TARDANZA_BASE,
                "blanda maxima " + blandaMaxima);
        assertEquals(blandaMaxima, EvaluadorFitness.penalizacionTiempo(0));
        assertTrue(EvaluadorFitness.penalizacionTiempo(-1) > EvaluadorFitness.penalizacionTiempo(0));
    }

    @Test
    void calcularFitness_entregaQueLlegaATiempo_cuestaMenosQueDejarlaEnCola() {
        // Distancias representativas de ida y vuelta: 58 km (cercano) y 138 km (lejano).
        for (Nodo destino : List.of(DESTINO_CERCANO, DESTINO_LEJANO)) {
            for (int plazo : new int[]{240, 480}) {
                SolucionRuteo ruteada = solucionConUnaEntrega(plazo, destino, TipoVehiculo.AUTO);
                SolucionRuteo enCola = new SolucionRuteo();
                enCola.getEspera().add(new Entrega(0, 0, destino, 4, 0, plazo));
                EvaluadorFitness evaluador = new EvaluadorFitness(escenario());

                assertTrue(evaluador.evaluar(ruteada) < evaluador.evaluar(enCola),
                        "destino " + destino + " plazo " + plazo);
            }
        }
    }

    @Test
    void calcularFitness_entregaEnEspera_sumaElPisoDeAbandono() {
        SolucionRuteo conEspera = new SolucionRuteo();
        conEspera.getEspera().add(new Entrega(0, 0, DESTINO_LEJANO, 4, 0, 240));
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario());

        double fitness = evaluador.evaluar(conEspera);

        assertTrue(fitness > EvaluadorFitness.PENALIZACION_SIN_RUTEAR_BASE, "fitness " + fitness);
    }

    @Test
    void calcularFitness_solucionConEntregas_esPositivoParaElIaco() {
        // PlanificadorIACO divide por el fitness al depositar feromona.
        EvaluadorFitness evaluador = new EvaluadorFitness(escenario());
        for (int plazo : new int[]{60, 240, 480, PLAZO_MAXIMO}) {
            SolucionRuteo solucion = solucionConUnaEntrega(plazo, DESTINO_CERCANO, TipoVehiculo.AUTO);
            assertTrue(evaluador.evaluar(solucion) > 0.0, "plazo " + plazo);
        }
    }

    private SolucionRuteo solucionConUnaEntrega(int plazoMinutos, Nodo destino, TipoVehiculo tipo) {
        Ruta ruta = new Ruta(new Vehiculo(0, tipo, central), central);
        ruta.getSecuencia().add(new Entrega(0, 0, destino, 4, 0, plazoMinutos));
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
