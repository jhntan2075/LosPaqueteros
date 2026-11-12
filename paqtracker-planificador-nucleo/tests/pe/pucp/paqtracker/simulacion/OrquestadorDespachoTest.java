package pe.pucp.paqtracker.simulacion;

import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modelo.Vehiculo;
import pe.pucp.paqtracker.util.Malla;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas del despacho del plan en el orquestador: pedidos que salen por partes, entregas que se
 * retienen en vez de despacharse tarde, rescate en la ultima oportunidad y destinos sin camino.
 * Los pedidos se registran a las 05:00, cuando ningun refrigerio cae dentro de los viajes. Semilla fija.
 */
class OrquestadorDespachoTest {

    private static final int SA_MINUTOS = 30;
    private static final long SEMILLA = 7L;
    private static final int PLAZO_REGULAR = 2160;
    private static final int PLAZO_CORTO = 240;
    private static final int CINCO_AM = 300;
    private static final int DOS_DIAS = 2 * 1440;

    private final List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes();

    @Test
    void simular_pedidoMayorQueLaCapacidadDeLaFlotaLibre_entregaTodaLaCantidad() {
        // 60 paquetes y un solo auto de 24: salen en tres viajes, no en uno.
        Pedido grande = new Pedido(1, new Nodo(30, 14), 60, CINCO_AM, PLAZO_REGULAR);

        ResultadoSimulacion resultado = simular(flota(1, 0, 0), new Malla(), grande);

        assertEquals(60, resultado.getProductosEntregados());
        assertFalse(resultado.getColapso().isPresent());
    }

    @Test
    void simular_soloQuedaLibreUnaUnidadQueLlegariaTarde_retieneLaEntregaHastaQueVuelveUnaRapida() {
        // El auto sale con el primer pedido (10 paquetes no caben en la bicicleta) y vuelve en una hora.
        Pedido paraElAuto = new Pedido(1, new Nodo(30, 14), 10, CINCO_AM, PLAZO_REGULAR);
        // A 46 km del central: la bicicleta tarda 230 min y llegaria tarde; el auto, 69 min.
        Pedido lejano = new Pedido(2, new Nodo(50, 37), 2, CINCO_AM + 1, PLAZO_CORTO);

        ResultadoSimulacion resultado = simular(flota(1, 0, 1), new Malla(), paraElAuto, lejano);

        assertFalse(resultado.getColapso().isPresent(), "no debio despacharse en la bicicleta");
        assertEquals(0, resultado.getTotalIncumplimientos());
        assertEquals(12, resultado.getProductosEntregados());
    }

    @Test
    void simular_pedidoQueSoloCabeEnElAutoOcupado_loReparteEntreMotocicletasEnSuUltimaOportunidad() {
        // El auto se va al extremo de la ciudad y no vuelve antes de que venza el segundo pedido.
        Pedido paraElAuto = new Pedido(1, new Nodo(70, 50), 10, CINCO_AM, PLAZO_REGULAR);
        // 10 paquetes no caben en una motocicleta (8), pero si en dos.
        Pedido repartible = new Pedido(2, new Nodo(37, 24), 10, CINCO_AM + 1, PLAZO_CORTO);

        ResultadoSimulacion resultado = simular(flota(1, 2, 0), new Malla(), paraElAuto, repartible);

        assertFalse(resultado.getColapso().isPresent(), "debio repartirse entre las dos motocicletas");
        assertEquals(20, resultado.getProductosEntregados());
        assertEquals(1, resultado.getUrgentesRepartidos());
    }

    @Test
    void simular_almacenEncerradoPorBloqueos_esperaAQueSeLevantenYEntregaSinDesbordar() {
        Nodo central = almacenes.get(0).getUbicacion();
        int finBloqueo = CINCO_AM + 200;
        Malla malla = new Malla(cercoAlrededorDe(central, CINCO_AM, finBloqueo));
        Pedido pedido = new Pedido(1, new Nodo(35, 20), 3, CINCO_AM, PLAZO_REGULAR);

        ResultadoSimulacion resultado = simular(flota(2, 0, 0), malla, pedido);

        assertFalse(resultado.getColapso().isPresent());
        assertEquals(3, resultado.getProductosEntregados());
        assertTrue(resultado.getDistanciaTotal() < Malla.DISTANCIA_SIN_CAMINO,
                "la distancia no debe incluir el valor de tramo sin camino");
    }

    private ResultadoSimulacion simular(List<Vehiculo> flota, Malla malla, Pedido... pedidos) {
        Orquestador orquestador = new Orquestador(almacenes, flota, List.of(pedidos), List.of(), malla,
                SA_MINUTOS, ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS, PLAZO_REGULAR, 0, SEMILLA);
        return orquestador.simular(CINCO_AM + DOS_DIAS);
    }

    private List<Vehiculo> flota(int autos, int motos, int bicicletas) {
        return ConfiguracionDominio.crearFlota(almacenes.get(0), autos, motos, bicicletas);
    }

    /**
     * @return bloqueos de los cuatro nodos vecinos, que dejan al nodo sin salida mientras estan vigentes
     */
    private static List<Bloqueo> cercoAlrededorDe(Nodo nodo, int inicio, int fin) {
        List<Bloqueo> cerco = new ArrayList<>();
        int[][] vecinos = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int[] vecino : vecinos) {
            int x = nodo.getX() + vecino[0];
            int y = nodo.getY() + vecino[1];
            cerco.add(new Bloqueo(inicio, fin, Malla.nodosDeTramo(x, y, x, y)));
        }
        return cerco;
    }
}
