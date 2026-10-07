package pe.pucp.paqtracker.modulos.pedidos;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoControlarEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoEjecutarDiaADia;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoConsultarPedidos;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoRegistrarPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaRegistroPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.SolicitudRegistroPedido;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Prueba de CU-01 y CU-04 sobre la operacion dia a dia, con el reloj real fijado en una fecha que
 * cubren los fixtures de ventas (enero de 2026).
 */
@SpringBootTest
@Import(IntegracionPedidosTest.RelojFijo.class)
class IntegracionPedidosTest {

    @Autowired
    private CasoUsoEjecutarDiaADia casoUsoDiaADia;

    @Autowired
    private CasoUsoRegistrarPedido casoUsoRegistrar;

    @Autowired
    private CasoUsoConsultarPedidos casoUsoConsultar;

    @Autowired
    private CasoUsoControlarEjecucion casoUsoControlar;

    @Test
    void registrarPedido_operacionDiaADiaEnCurso_loDespachaYLoGuardaConSuCliente() {
        casoUsoDiaADia.ejecutar();

        RespuestaRegistroPedido respuesta = casoUsoRegistrar.ejecutar(
                new SolicitudRegistroPedido("Bodega Rosita", 35, 20, 3, 12));

        assertTrue(respuesta.replanifico());
        assertEquals("EN_TRANSITO", respuesta.pedido().estado());
        assertNotNull(respuesta.pedido().unidad());
        List<RespuestaPedido> pedidos = casoUsoConsultar.ejecutar(respuesta.ejecucionId());
        assertTrue(pedidos.stream().anyMatch(pedido -> "Bodega Rosita".equals(pedido.cliente())
                && pedido.codigo().equals(respuesta.pedido().codigo())));
    }

    @Test
    void ejecutarDiaADia_trasReiniciar_recuperaPedidosVigentesSinRepetirCodigos() {
        casoUsoDiaADia.ejecutar();
        RespuestaRegistroPedido antes = casoUsoRegistrar.ejecutar(
                new SolicitudRegistroPedido("Antes del reinicio", 20, 30, 2, 36));
        casoUsoControlar.ejecutar(ServicioEjecucion.ID_DIA_A_DIA, CasoUsoControlarEjecucion.Accion.DETENER);

        casoUsoDiaADia.ejecutar();
        RespuestaRegistroPedido despues = casoUsoRegistrar.ejecutar(
                new SolicitudRegistroPedido("Despues del reinicio", 25, 30, 2, 36));

        assertNotEquals(antes.pedido().codigo(), despues.pedido().codigo());
        List<RespuestaPedido> pedidos = casoUsoConsultar.ejecutar(ServicioEjecucion.ID_DIA_A_DIA);
        assertTrue(pedidos.stream().anyMatch(pedido -> antes.pedido().codigo().equals(pedido.codigo())
                && "Antes del reinicio".equals(pedido.cliente())));
    }

    @Test
    void registrarPedido_destinoFueraDeLaMalla_lanzaExcepcion() {
        casoUsoDiaADia.ejecutar();

        assertThrows(SolicitudInvalidaException.class, () -> casoUsoRegistrar.ejecutar(
                new SolicitudRegistroPedido("Cliente", 90, 20, 3, 12)));
    }

    /** Reloj real detenido el 1 de enero de 2026 a las 10:00 de Lima. */
    @TestConfiguration
    static class RelojFijo {

        @Bean
        @Primary
        Clock relojFijo() {
            return Clock.fixed(Instant.parse("2026-01-01T15:00:00Z"), ZoneId.of("America/Lima"));
        }
    }
}
