package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.comun.archivos.PuertoAlmacenArchivos;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaImportacion;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de CU-02 Importar pedidos desde archivo.
 */
class CasoUsoImportarPedidosTest {

    private final Map<YearMonth, byte[]> guardados = new HashMap<>();
    private final PuertoAlmacenArchivos almacen = guardados::put;
    private final CasoUsoImportarPedidos casoUso = new CasoUsoImportarPedidos(almacen);

    @Test
    void ejecutar_archivoValido_loGuardaEnSuMes() {
        byte[] contenido = "01d01h30m:56,30,c4910,02,36\n02d10h00m:10,40,c0001,05,12\n"
                .getBytes(StandardCharsets.UTF_8);

        RespuestaImportacion respuesta = casoUso.ejecutar("202603", contenido);

        assertTrue(respuesta.guardado());
        assertEquals(2, respuesta.registrosValidos());
        assertTrue(guardados.containsKey(YearMonth.of(2026, 3)));
    }

    @Test
    void ejecutar_archivoConErrores_informaLineasYNoLoGuarda() {
        byte[] contenido = "01d01h30m:56,30,c4910,02,36\nlinea rota\n".getBytes(StandardCharsets.UTF_8);

        RespuestaImportacion respuesta = casoUso.ejecutar("202603", contenido);

        assertFalse(respuesta.guardado());
        assertEquals(1, respuesta.errores().size());
        assertTrue(guardados.isEmpty());
    }

    @Test
    void ejecutar_mesConFormatoInvalido_lanzaExcepcion() {
        byte[] contenido = "01d01h30m:56,30,c4910,02,36\n".getBytes(StandardCharsets.UTF_8);

        assertThrows(SolicitudInvalidaException.class, () -> casoUso.ejecutar("2026-03", contenido));
    }
}
