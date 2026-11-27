package pe.pucp.paqtracker.modulos.incidencias.aplicacion.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.lectura.CargadorMantenimiento;
import pe.pucp.paqtracker.lectura.CargadorMantenimiento.LineaMantenimiento;
import pe.pucp.paqtracker.lectura.ResultadoValidacion;
import pe.pucp.paqtracker.modulos.incidencias.dominio.MantenimientoRegistrado;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioMantenimiento;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Iguala la tabla {@code mantenimiento} al plan de mantenimiento preventivo configurado: un archivo
 * {@code mant.preventivo.*.txt} o una carpeta con varios. Guarda las intervenciones nuevas y borra las que ya
 * no estan en el archivo, asi que reemplazar el archivo y reiniciar la API basta para cargar otra version. Si
 * el archivo falta o tiene alguna linea invalida, la base queda como estaba.
 */
@Service
public class CargaMantenimientoSistema {

    private static final Logger LOGGER = LoggerFactory.getLogger(CargaMantenimientoSistema.class);
    private static final Pattern NOMBRE_ARCHIVO = Pattern.compile("(?i).*mant.*preventivo.*\\.txt");

    private final RepositorioMantenimiento repositorio;
    private final String ruta;

    /**
     * @param repositorio persistencia del plan
     * @param propiedades parametros de la operacion, con la ruta del plan
     */
    public CargaMantenimientoSistema(RepositorioMantenimiento repositorio, PropiedadesDominio propiedades) {
        this.repositorio = repositorio;
        this.ruta = propiedades.datos().mantenimiento();
    }

    /**
     * Resultado de una sincronizacion.
     *
     * @param enArchivo  intervenciones validas leidas del archivo
     * @param guardadas  intervenciones nuevas guardadas en la base
     * @param borradas   intervenciones de la base que ya no estaban en el archivo
     * @param errores    lineas rechazadas; si hay alguna no se cambio la base
     */
    public record Sincronizacion(int enArchivo, int guardadas, int borradas, List<String> errores) {
    }

    /**
     * @return lo que se cargo; sin ruta configurada o sin archivo no cambia nada
     */
    public Sincronizacion sincronizar() {
        if (ruta == null || ruta.isBlank()) {
            LOGGER.info("Sin archivo de mantenimiento preventivo configurado: se opera sin mantenimientos");
            return new Sincronizacion(0, 0, 0, List.of());
        }
        Path origen = Path.of(ruta);
        List<Path> archivos = archivosDe(origen);
        if (archivos.isEmpty()) {
            LOGGER.warn("No existe el plan de mantenimiento preventivo {}: la base queda como estaba", origen);
            return new Sincronizacion(0, 0, 0, List.of());
        }
        List<String> errores = new ArrayList<>();
        Map<String, MantenimientoRegistrado> delArchivo = new LinkedHashMap<>();
        for (Path archivo : archivos) {
            List<String> lineas = leerLineas(archivo);
            ResultadoValidacion validacion = CargadorMantenimiento.validar(lineas);
            if (!validacion.esValido()) {
                validacion.getErrores().forEach(error -> errores.add(archivo.getFileName() + " · " + error));
                continue;
            }
            for (LineaMantenimiento linea : CargadorMantenimiento.leer(lineas)) {
                MantenimientoRegistrado registro = new MantenimientoRegistrado(null, linea.fecha(),
                        linea.codigoArchivo(), linea.tipo(), linea.correlativo());
                if (delArchivo.putIfAbsent(registro.clave(), registro) != null) {
                    errores.add(archivo.getFileName() + " · la unidad " + registro.codigoUnidad()
                            + " ya tiene mantenimiento el " + registro.fecha() + " en otro archivo");
                }
            }
        }
        if (!errores.isEmpty()) {
            LOGGER.error("El plan de mantenimiento preventivo {} tiene {} lineas invalidas; la base queda como"
                    + " estaba: {}", origen, errores.size(), errores);
            return new Sincronizacion(delArchivo.size(), 0, 0, List.copyOf(errores));
        }
        List<MantenimientoRegistrado> enBase = repositorio.listarTodos();
        Set<String> clavesEnBase = enBase.stream().map(MantenimientoRegistrado::clave).collect(Collectors.toSet());
        List<Long> sobrantes = enBase.stream().filter(m -> !delArchivo.containsKey(m.clave()))
                .map(MantenimientoRegistrado::id).toList();
        List<MantenimientoRegistrado> nuevas = delArchivo.values().stream()
                .filter(m -> !clavesEnBase.contains(m.clave())).toList();
        if (!sobrantes.isEmpty()) {
            repositorio.borrar(sobrantes);
        }
        if (!nuevas.isEmpty()) {
            repositorio.guardarTodos(nuevas);
        }
        if (!sobrantes.isEmpty() || !nuevas.isEmpty()) {
            LOGGER.info("Plan de mantenimiento preventivo {}: {} intervenciones, {} nuevas y {} borradas", origen,
                    delArchivo.size(), nuevas.size(), sobrantes.size());
        }
        return new Sincronizacion(delArchivo.size(), nuevas.size(), sobrantes.size(), List.of());
    }

    private static List<Path> archivosDe(Path origen) {
        if (Files.isRegularFile(origen)) {
            return List.of(origen);
        }
        if (!Files.isDirectory(origen)) {
            return List.of();
        }
        try (Stream<Path> archivos = Files.list(origen)) {
            return archivos.filter(Files::isRegularFile)
                    .filter(archivo -> NOMBRE_ARCHIVO.matcher(archivo.getFileName().toString()).matches())
                    .sorted(Comparator.comparing(archivo -> archivo.getFileName().toString())).toList();
        } catch (IOException excepcion) {
            throw new UncheckedIOException("No se pudo recorrer la carpeta " + origen, excepcion);
        }
    }

    private static List<String> leerLineas(Path archivo) {
        try {
            return Files.readAllLines(archivo, StandardCharsets.UTF_8);
        } catch (IOException excepcion) {
            throw new UncheckedIOException("No se pudo leer " + archivo, excepcion);
        }
    }
}
