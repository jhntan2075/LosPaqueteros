package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.comun.archivos.PuertoAlmacenArchivos;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaImportacion;
import pe.pucp.paqtracker.modulos.pedidos.dominio.OrigenPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.soporte.PropiedadesPrueba;
import pe.pucp.paqtracker.soporte.RepositorioPedidoEnMemoria;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de CU-02 Importar pedidos desde archivo y de la importacion de bloqueos.
 */
class CasoUsoImportarPedidosTest {

    /** Largo de la columna pedido.lote. */
    private static final int LARGO_COLUMNA_LOTE = 40;

    private final Map<YearMonth, byte[]> bloqueos = new HashMap<>();
    private final PuertoAlmacenArchivos almacen = (mes, contenido) -> bloqueos.put(mes, contenido);
    private final RepositorioPedidoEnMemoria repositorio = new RepositorioPedidoEnMemoria();
    private final CasoUsoImportarPedidos casoUso = new CasoUsoImportarPedidos(repositorio, PropiedadesPrueba.crear());
    private final CasoUsoImportarBloqueos casoUsoBloqueos = new CasoUsoImportarBloqueos(almacen);

    @Test
    void ejecutar_archivoValido_loGuardaComoLoteDeLaCorrida() {
        byte[] contenido = "01d01h30m:56,30,c4910,02,36\n02d10h00m:10,40,c0001,05,12\n"
                .getBytes(StandardCharsets.UTF_8);

        RespuestaImportacion respuesta = casoUso.ejecutar("202603", contenido);

        assertTrue(respuesta.guardado());
        assertEquals(2, respuesta.registrosValidos());
        assertNotNull(respuesta.lote());
        assertTrue(respuesta.lote().length() <= LARGO_COLUMNA_LOTE);
        List<PedidoRegistrado> guardados = repositorio.getPedidos();
        assertEquals(2, guardados.size());
        assertTrue(guardados.stream().allMatch(pedido -> pedido.origen() == OrigenPedido.ARCHIVO_CORRIDA
                && respuesta.lote().equals(pedido.lote()) && "202603".equals(pedido.mesArchivo())));
        // 1 de marzo de 2026, 01:30 en Lima (UTC-5); el plazo del archivo es de 36 h.
        assertEquals(Instant.parse("2026-03-01T06:30:00Z"), guardados.get(0).registradoEn());
        assertEquals(Instant.parse("2026-03-02T18:30:00Z"), guardados.get(0).horaLimite());
        assertEquals("c4910", guardados.get(0).cliente());
    }

    @Test
    void ejecutar_dosVeces_creaDosLotesSinReemplazarNada() {
        byte[] contenido = "01d01h30m:56,30,c4910,02,36\n".getBytes(StandardCharsets.UTF_8);

        RespuestaImportacion primera = casoUso.ejecutar("202603", contenido);
        RespuestaImportacion segunda = casoUso.ejecutar("202603", contenido);

        assertNotEquals(primera.lote(), segunda.lote());
        assertEquals(2, repositorio.getPedidos().size());
    }

    @Test
    void ejecutar_archivoConErrores_informaLineasYNoLoGuarda() {
        byte[] contenido = "01d01h30m:56,30,c4910,02,36\nlinea rota\n".getBytes(StandardCharsets.UTF_8);

        RespuestaImportacion respuesta = casoUso.ejecutar("202603", contenido);

        assertFalse(respuesta.guardado());
        assertNull(respuesta.lote());
        assertEquals(List.of(2), respuesta.lineasInvalidas());
        assertTrue(repositorio.getPedidos().isEmpty());
    }

    @Test
    void ejecutar_mesConFormatoInvalido_lanzaExcepcion() {
        byte[] contenido = "01d01h30m:56,30,c4910,02,36\n".getBytes(StandardCharsets.UTF_8);

        assertThrows(SolicitudInvalidaException.class, () -> casoUso.ejecutar("2026-03", contenido));
    }

    @Test
    void importarBloqueos_archivoValido_loGuardaEnSuMes() {
        byte[] contenido = "01d02h22m-01d04h42m:25,45,45,45,45,40\n".getBytes(StandardCharsets.UTF_8);

        RespuestaImportacion respuesta = casoUsoBloqueos.ejecutar("202603", contenido);

        assertTrue(respuesta.guardado());
        assertNull(respuesta.lote());
        assertTrue(bloqueos.containsKey(YearMonth.of(2026, 3)));
    }
}
