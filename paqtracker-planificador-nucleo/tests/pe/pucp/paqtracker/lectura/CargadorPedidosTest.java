package pe.pucp.paqtracker.lectura;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import pe.pucp.paqtracker.modelo.Pedido;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas de la validacion linea por linea de archivos de ventas (CU-02).
 */
class CargadorPedidosTest {

    @Test
    void validar_lineasCorrectas_cuentaTodasSinErrores() {
        ResultadoValidacion resultado = CargadorPedidos.validar(List.of(
                "01d01h30m:56,30,c4910,02,36",
                "# comentario",
                "",
                "02d10h00m:10,40,c0001,05,12"));

        assertEquals(2, resultado.getRegistrosValidos());
        assertTrue(resultado.esValido());
    }

    @Test
    void validar_lineasInvalidas_informaCadaUnaConSuNumero() {
        ResultadoValidacion resultado = CargadorPedidos.validar(List.of(
                "01d01h30m:56,30,c4910,02,36",
                "01d01h30m:56,30",
                "01d01h30m:99,30,c4910,02,36",
                "01d01h30m:5,30,c4910,xx,36"));

        assertEquals(1, resultado.getRegistrosValidos());
        assertEquals(3, resultado.getErrores().size());
        assertEquals(List.of(2, 3, 4), resultado.getLineasInvalidas());
        assertTrue(resultado.getErrores().get(0).startsWith("Linea 2:"));
        assertTrue(resultado.getErrores().get(1).startsWith("Linea 3:"));
        assertTrue(resultado.getErrores().get(2).startsWith("Linea 4:"));
    }

    @Test
    void cargar_formatoConMarcaDeTiempo_conservaElCliente(@TempDir Path carpeta) throws IOException {
        Path archivo = Files.writeString(carpeta.resolve("ventas.202601.txt"), "01d01h30m:56,30,c4910,02,36" + System.lineSeparator());

        List<Pedido> pedidos = CargadorPedidos.cargar(archivo.toString(), Integer.MAX_VALUE);

        assertEquals("c4910", pedidos.get(0).getCliente());
    }

    @Test
    void leer_lineasConComentarios_numeraEnOrdenYUbicaEnElMes() {
        List<Pedido> pedidos = CargadorPedidos.leer(List.of(
                "# encabezado",
                "01d01h30m:56,30,c4910,02,36",
                "",
                "02d00h05m:10,12,c0001,04,08"));

        assertEquals(2, pedidos.size());
        assertEquals(List.of(0, 1), pedidos.stream().map(Pedido::getId).toList());
        assertEquals(90, pedidos.get(0).getInstanteRegistro());
        assertEquals(1445, pedidos.get(1).getInstanteRegistro());
        assertEquals(480, pedidos.get(1).getPlazo());
        assertEquals("c0001", pedidos.get(1).getCliente());
    }
}
