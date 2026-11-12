package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.archivos.MesArchivo;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.lectura.CargadorPedidos;
import pe.pucp.paqtracker.lectura.ResultadoValidacion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaImportacion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.servicio.ConversorArchivoVentas;
import pe.pucp.paqtracker.modulos.pedidos.dominio.OrigenPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Implementa CU-02 Importar pedidos desde archivo: valida el archivo de ventas de un mes linea por linea y,
 * si no tiene errores, guarda sus pedidos como un lote propio para una sola simulacion (LE-006, LE-007). El
 * lote no reemplaza a los pedidos del sistema: la simulacion que lo recibe usa sus pedidos en ese mes y los del
 * sistema en los demas. Un lote que ninguna simulacion usa se borra al reiniciar la API.
 */
@Service
public class CasoUsoImportarPedidos {

    private static final String PREFIJO_LOTE = "corrida-";

    private final RepositorioPedido repositorio;
    private final ZoneId zona;

    /**
     * @param repositorio persistencia de pedidos
     * @param propiedades parametros de la operacion, con la zona horaria
     */
    public CasoUsoImportarPedidos(RepositorioPedido repositorio, PropiedadesDominio propiedades) {
        this.repositorio = repositorio;
        this.zona = ZoneId.of(propiedades.ejecucion().zonaHoraria());
    }

    /**
     * @param mes       mes del archivo, en formato YYYYMM
     * @param contenido contenido del archivo, en UTF-8
     * @return registros validos, errores por linea y, si no hay errores, el lote con sus pedidos
     * @throws SolicitudInvalidaException si el mes no tiene formato YYYYMM o el archivo esta vacio
     */
    public RespuestaImportacion ejecutar(String mes, byte[] contenido) {
        YearMonth mesArchivo = MesArchivo.interpretar(mes);
        if (contenido == null || contenido.length == 0) {
            throw new SolicitudInvalidaException("El archivo de ventas esta vacio");
        }
        List<String> lineas = new String(contenido, StandardCharsets.UTF_8).lines().toList();
        ResultadoValidacion validacion = CargadorPedidos.validar(lineas);
        String lote = null;
        if (validacion.esValido() && validacion.getRegistrosValidos() > 0) {
            // Sin guiones, el lote cabe en las 40 posiciones de la columna.
            lote = PREFIJO_LOTE + UUID.randomUUID().toString().replace("-", "");
            repositorio.guardarTodos(ConversorArchivoVentas.convertir(lineas, mesArchivo, zona,
                    OrigenPedido.ARCHIVO_CORRIDA, lote));
        }
        return new RespuestaImportacion(mes, validacion.getRegistrosValidos(), validacion.getErrores(),
                validacion.getLineasInvalidas(), lote != null, lote);
    }
}
