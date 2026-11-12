package pe.pucp.paqtracker.modulos.pedidos.aplicacion.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.pedidos.dominio.OrigenPedido;
import pe.pucp.paqtracker.modulos.pedidos.dominio.PedidoRegistrado;
import pe.pucp.paqtracker.modulos.pedidos.dominio.RepositorioPedido;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Vuelca a la base los archivos de ventas del curso que estan en la carpeta configurada. Es idempotente:
 * solo carga los meses que la base aun no tiene, asi que en la practica corre una vez. Para cargar una
 * version nueva de un mes se borran sus pedidos del sistema y se reemplaza el archivo.
 */
@Service
public class CargaPedidosSistema {

    private static final Logger LOGGER = LoggerFactory.getLogger(CargaPedidosSistema.class);
    private static final Pattern NOMBRE_ARCHIVO = Pattern.compile("ventas\\.(\\d{6})\\.txt");
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");

    private final RepositorioPedido repositorio;
    private final Path carpetaVentas;
    private final ZoneId zona;

    /**
     * @param repositorio persistencia de pedidos
     * @param propiedades parametros de la operacion, con la carpeta de ventas y la zona horaria
     */
    public CargaPedidosSistema(RepositorioPedido repositorio, PropiedadesDominio propiedades) {
        this.repositorio = repositorio;
        this.carpetaVentas = Path.of(propiedades.datos().ventas());
        this.zona = ZoneId.of(propiedades.ejecucion().zonaHoraria());
    }

    /**
     * Carga los meses faltantes. Un archivo ilegible o con lineas invalidas se informa y se salta: no
     * impide que la API arranque con los demas meses.
     *
     * @return pedidos cargados en esta llamada
     */
    public int cargarFaltantes() {
        if (!Files.isDirectory(carpetaVentas)) {
            LOGGER.warn("No existe la carpeta de ventas {}: no se cargan pedidos del sistema", carpetaVentas);
            return 0;
        }
        Set<YearMonth> cargados = repositorio.mesesDelLote(PedidoRegistrado.LOTE_SISTEMA);
        int total = 0;
        for (Path archivo : archivosDeVentas()) {
            YearMonth mes = mesDe(archivo);
            if (!cargados.contains(mes)) {
                total += cargarMes(archivo, mes);
            }
        }
        if (total > 0) {
            LOGGER.info("Se cargaron {} pedidos del sistema desde {}", total, carpetaVentas);
        }
        return total;
    }

    private int cargarMes(Path archivo, YearMonth mes) {
        try {
            List<PedidoRegistrado> pedidos = ConversorArchivoVentas.convertir(
                    Files.readAllLines(archivo, StandardCharsets.UTF_8), mes, zona, OrigenPedido.ARCHIVO_SISTEMA,
                    PedidoRegistrado.LOTE_SISTEMA);
            repositorio.guardarTodos(pedidos);
            return pedidos.size();
        } catch (IOException | IllegalArgumentException excepcion) {
            LOGGER.error("No se pudo cargar el archivo de ventas {}", archivo, excepcion);
            return 0;
        }
    }

    private List<Path> archivosDeVentas() {
        try (Stream<Path> archivos = Files.list(carpetaVentas)) {
            return archivos.filter(Files::isRegularFile)
                    .filter(archivo -> NOMBRE_ARCHIVO.matcher(archivo.getFileName().toString()).matches())
                    .sorted(Comparator.comparing(archivo -> archivo.getFileName().toString())).toList();
        } catch (IOException excepcion) {
            throw new UncheckedIOException("No se pudo recorrer la carpeta " + carpetaVentas, excepcion);
        }
    }

    private static YearMonth mesDe(Path archivo) {
        Matcher coincidencia = NOMBRE_ARCHIVO.matcher(archivo.getFileName().toString());
        if (!coincidencia.matches()) {
            throw new IllegalArgumentException("Nombre de archivo de ventas invalido: " + archivo);
        }
        return YearMonth.parse(coincidencia.group(1), FORMATO_MES);
    }
}
