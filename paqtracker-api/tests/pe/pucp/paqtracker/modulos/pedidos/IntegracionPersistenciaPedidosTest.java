package pe.pucp.paqtracker.modulos.pedidos;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoControlarEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoEjecutarSimulacionPeriodo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudCreacionEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ColapsoRegistrado;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoImportarPedidos;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaImportacion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.servicio.CargaPedidosSistema;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pedidos y ejecuciones guardados en la base: carga de los archivos del sistema, lote de un archivo subido para
 * una sola corrida, resultado de cada ejecucion e historial. Usa el fixture de ventas de enero de 2026 (7
 * pedidos, 6 del primer dia).
 */
@SpringBootTest
class IntegracionPersistenciaPedidosTest {

    private static final LocalDate PRIMER_DIA = LocalDate.of(2026, 1, 1);
    private static final Instant INICIO_ENERO = Instant.parse("2026-01-01T05:00:00Z");
    private static final Instant INICIO_FEBRERO = Instant.parse("2026-02-01T05:00:00Z");
    private static final int PEDIDOS_DEL_FIXTURE = 7;
    private static final int PEDIDOS_DEL_PRIMER_DIA = 6;
    private static final String ARCHIVO_PROPIO = "01d02h00m:12,14,c9001,03,36\n01d04h00m:44,21,c9002,02,24\n";

    @Autowired
    private CargaPedidosSistema carga;

    @Autowired
    private RepositorioPedido repositorio;

    @Autowired
    private CasoUsoImportarPedidos importar;

    @Autowired
    private CargadorDatosEscenario cargadorDatos;

    @Autowired
    private CasoUsoEjecutarSimulacionPeriodo periodo;

    @Autowired
    private CasoUsoControlarEjecucion controlar;

    @Autowired
    private ServicioEjecucion servicioEjecucion;

    @Autowired
    private RepositorioEjecucion repositorioEjecucion;

    @Test
    void cargaInicial_alArrancar_guardaLosPedidosDelSistemaUnaSolaVez() {
        assertTrue(repositorio.mesesDelLote(PedidoRegistrado.LOTE_SISTEMA).contains(YearMonth.of(2026, 1)));
        assertEquals(PEDIDOS_DEL_FIXTURE, pedidosDelSistemaEnEnero().size());

        assertEquals(0, carga.cargarFaltantes());

        assertEquals(PEDIDOS_DEL_FIXTURE, pedidosDelSistemaEnEnero().size());
    }

    @Test
    void cargarRango_sinArchivoSubido_usaLosPedidosDelSistemaConSuIdDeLaBase() {
        DatosEscenario datos = cargadorDatos.cargarRango(PRIMER_DIA, LocalTime.MIDNIGHT, 1, null);

        assertEquals(DatosEscenario.ORIGEN_SISTEMA, datos.origenDatos());
        assertEquals(PEDIDOS_DEL_PRIMER_DIA, datos.pedidos().size());
        Set<Integer> idsSistema = pedidosDelSistemaEnEnero().stream().map(pedido -> pedido.id().intValue())
                .collect(Collectors.toSet());
        assertTrue(datos.pedidos().stream().allMatch(pedido -> idsSistema.contains(pedido.getId())));
        assertEquals(List.of(10, 40, 90, 180, 320, 480),
                datos.pedidos().stream().map(Pedido::getInstanteRegistro).toList());
    }

    @Test
    void cargarRango_conArchivoSubido_usaSusPedidosYNoTocaLosDelSistema() {
        String lote = subirArchivoPropio();

        DatosEscenario datos = cargadorDatos.cargarRango(PRIMER_DIA, LocalTime.MIDNIGHT, 1, lote);

        assertEquals(DatosEscenario.ORIGEN_ARCHIVO, datos.origenDatos());
        assertEquals(List.of("c9001", "c9002"), datos.pedidos().stream().map(Pedido::getCliente).toList());
        assertEquals(PEDIDOS_DEL_FIXTURE, pedidosDelSistemaEnEnero().size());
    }

    @Test
    void crearSimulacion_conArchivoSubido_ataElLoteYGuardaElContexto() {
        String lote = subirArchivoPropio();

        RespuestaEjecucion creada = periodo.ejecutar(solicitud(lote));
        controlar.ejecutar(creada.id(), CasoUsoControlarEjecucion.Accion.DETENER);
        repositorio.borrarLotesSinEjecucion();

        assertFalse(repositorio.mesesDelLote(lote).isEmpty(), "el lote atado a la corrida no es huerfano");
        RegistroEjecucion guardada = repositorioEjecucion.buscar(creada.id()).orElseThrow();
        assertEquals(DatosEscenario.ORIGEN_ARCHIVO, guardada.origenDatos());
        assertEquals(creada.nombre(), guardada.nombre());
        assertEquals(1L, guardada.semilla());
        assertTrue(guardada.parametros().contains("semaforo") && guardada.parametros().contains("dominio"));
        assertEquals(EstadoEjecucion.FINALIZADA, guardada.estado());
    }

    @Test
    void crearSimulacion_conLoteInexistente_seRechaza() {
        assertThrows(SolicitudInvalidaException.class, () -> periodo.ejecutar(solicitud("corrida-no-existe")));
    }

    @Test
    void borrarLotesSinEjecucion_loteQueNadieUso_loBorra() {
        String lote = subirArchivoPropio();

        repositorio.borrarLotesSinEjecucion();

        assertTrue(repositorio.mesesDelLote(lote).isEmpty());
    }

    @Test
    void consultar_ejecucionQueSoloEstaGuardada_laDevuelveComoHistoricaConSuResultado() {
        ResultadoEjecucion resultado = new ResultadoEjecucion(40, 2, 2, 123.5, 610.0, 150, 6, 90, 300, 12, 800,
                4000, 10, 7, 5, 4, 3, 1);
        ColapsoRegistrado colapso = new ColapsoRegistrado(Instant.parse("2026-01-02T10:00:00Z"), "ENTREGA_TARDIA",
                "P-00007", "A-01", Instant.parse("2026-01-02T09:00:00Z"), Instant.parse("2026-01-02T11:00:00Z"));
        repositorioEjecucion.guardar(new RegistroEjecucion("colapso-historico", "Colapso de prueba",
                TipoEscenario.COLAPSO_LOGISTICO, EstadoEjecucion.COLAPSADA, "GA", PRIMER_DIA, LocalTime.MIDNIGHT, 7,
                180, Instant.parse("2026-01-05T12:00:00Z"), Instant.parse("2026-01-05T12:30:00Z"), 10, 15, 12,
                resultado, colapso, DatosEscenario.ORIGEN_SISTEMA, 1L, "{}", Instant.parse("2026-01-02T10:00:00Z")));

        RespuestaEjecucion historica = servicioEjecucion.consultar("colapso-historico");

        assertTrue(historica.historica());
        assertEquals("Colapso de prueba", historica.nombre());
        assertEquals(123.5, historica.resultado().metricas().distanciaKm());
        assertEquals("P-00007", historica.resultado().colapso().pedido());
        assertEquals(400.0, historica.resultado().tiempoComputoPromedioMs());
        assertTrue(servicioEjecucion.listar().stream()
                .anyMatch(ejecucion -> ejecucion.id().equals("colapso-historico") && ejecucion.historica()));
    }

    private List<PedidoRegistrado> pedidosDelSistemaEnEnero() {
        return repositorio.listarDelLote(PedidoRegistrado.LOTE_SISTEMA, INICIO_ENERO, INICIO_FEBRERO);
    }

    private String subirArchivoPropio() {
        RespuestaImportacion respuesta = importar.ejecutar("202601", ARCHIVO_PROPIO.getBytes(StandardCharsets.UTF_8));
        assertTrue(respuesta.guardado());
        return respuesta.lote();
    }

    private static SolicitudCreacionEjecucion solicitud(String lote) {
        return new SolicitudCreacionEjecucion("SIMULACION_PERIODO", PRIMER_DIA, 1, null, null, null, lote);
    }
}
