package pe.pucp.paqtracker.modulos.pedidos;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoControlarEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoEjecutarDiaADia;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoAvance;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.pedidos.dominio.OrigenPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * El dia a dia retoma tras un reinicio de la API a partir de lo guardado: la fila del mes (con su primer
 * arranque y su resultado) y el avance de cada pedido. Usa febrero de 2026, que no tiene pedidos del sistema
 * en los fixtures, para no depender de otras pruebas.
 */
@SpringBootTest
@Import(IntegracionRecuperacionDiaADiaTest.RelojFijo.class)
class IntegracionRecuperacionDiaADiaTest {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    /** 10 de febrero de 2026, 10:00 en Lima. */
    private static final Instant AHORA = Instant.parse("2026-02-10T15:00:00Z");
    private static final Instant PRIMER_ARRANQUE = AHORA.minus(Duration.ofDays(1));
    private static final Instant INICIO_FEBRERO = Instant.parse("2026-02-01T05:00:00Z");
    private static final Instant INICIO_MARZO = Instant.parse("2026-03-01T05:00:00Z");

    @Autowired
    private RepositorioPedido repositorio;

    @Autowired
    private RepositorioEjecucion repositorioEjecucion;

    @Autowired
    private CasoUsoEjecutarDiaADia casoUsoDiaADia;

    @Autowired
    private CasoUsoControlarEjecucion controlar;

    @Autowired
    private CargadorDatosEscenario cargadorDatos;

    @Test
    void ejecutar_trasUnReinicio_retomaLoPendienteMarcaLoVencidoYSumaElResultado() {
        repositorioEjecucion.guardar(mesGuardado());
        long vencido = manual("Vencido", AHORA.minus(Duration.ofHours(10)), 4, 3, EstadoAvance.REGISTRADO, 0);
        long parcial = manual("Parcial", AHORA.minus(Duration.ofHours(2)), 36, 5, EstadoAvance.EN_TRANSITO, 2);
        long entregado = manual("Entregado", AHORA.minus(Duration.ofHours(3)), 36, 3, EstadoAvance.ENTREGADO, 3);
        long anterior = manual("Anterior", PRIMER_ARRANQUE.minus(Duration.ofHours(5)), 36, 2, null, 0);

        casoUsoDiaADia.ejecutar();
        controlar.ejecutar(ServicioEjecucion.ID_DIA_A_DIA, CasoUsoControlarEjecucion.Accion.DETENER);

        Map<Long, PedidoRegistrado> guardados = repositorio.listarManuales(INICIO_FEBRERO, INICIO_MARZO).stream()
                .collect(Collectors.toMap(PedidoRegistrado::id, pedido -> pedido));
        assertEquals(EstadoAvance.INCUMPLIDO.name(), guardados.get(vencido).estado());
        RegistroEjecucion mes = repositorioEjecucion.buscar("dia-a-dia-202602").orElseThrow();
        assertEquals(PRIMER_ARRANQUE, mes.creadaEn(), "la fila conserva el primer arranque del mes");
        assertEquals(1 + 1, mes.resultado().incumplimientos(), "el guardado mas el que vencio con la API detenida");
        assertTrue(mes.resultado().entregas() >= 4, "suma sobre lo que ya estaba guardado");

        DatosEscenario datos = cargadorDatos.cargarDiaADia(ZonedDateTime.ofInstant(AHORA, LIMA), PRIMER_ARRANQUE)
                .datos();
        List<Integer> ids = datos.pedidos().stream().map(Pedido::getId).toList();
        assertTrue(ids.contains((int) parcial));
        assertFalse(ids.contains((int) vencido));
        assertFalse(ids.contains((int) entregado));
        assertFalse(ids.contains((int) anterior), "antes del primer arranque del mes no se opero");
        Pedido pendiente = datos.pedidos().stream().filter(pedido -> pedido.getId() == parcial).findFirst()
                .orElseThrow();
        assertEquals(5 - 2, pendiente.getCantidad(), "solo entra lo que falta entregar");
        assertEquals(2, datos.entregadasPrevias().get((int) parcial));
    }

    private RegistroEjecucion mesGuardado() {
        ResultadoEjecucion previo = new ResultadoEjecucion(4, 1, 1, 30, 90, 12, 2, 15, 30, 20, 500, 2000, 20, 6,
                3, 2, 1, 0);
        return new RegistroEjecucion("dia-a-dia-202602", "Operación día a día", TipoEscenario.DIA_A_DIA,
                EstadoEjecucion.FINALIZADA, "GA", LocalDate.of(2026, 2, 1), LocalTime.MIDNIGHT, 28, 1,
                PRIMER_ARRANQUE, AHORA.minus(Duration.ofHours(1)), 10, 15, 12, previo, null,
                DatosEscenario.ORIGEN_SISTEMA, 1L, null, AHORA.minus(Duration.ofHours(1)));
    }

    private long manual(String cliente, Instant registro, int plazoHoras, int cantidad, EstadoAvance estado,
                        int entregada) {
        PedidoRegistrado guardado = repositorio.guardar(new PedidoRegistrado(null, OrigenPedido.MANUAL, null, null,
                null, "dia-a-dia-202602", cliente, 30, 20, cantidad, plazoHoras, registro,
                registro.plus(Duration.ofHours(plazoHoras)), null, 0));
        if (estado != null) {
            repositorio.registrarAvance(List.of(new AvancePedido(guardado.id().intValue(), estado, entregada,
                    null, null)));
        }
        return guardado.id();
    }

    /** Reloj real detenido el 10 de febrero de 2026 a las 10:00 de Lima. */
    @TestConfiguration
    static class RelojFijo {

        @Bean
        @Primary
        Clock relojFijo() {
            return Clock.fixed(AHORA, LIMA);
        }
    }
}
