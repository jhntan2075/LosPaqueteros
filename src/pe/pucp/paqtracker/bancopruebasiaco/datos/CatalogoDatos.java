package pe.pucp.paqtracker.bancopruebasiaco.datos;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Bloqueo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.EscenarioOperativo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Pedido;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Localiza los archivos de datos bajo un directorio raíz sin depender de la
 * carpeta exacta: acepta {@code ventas.202601.txt}, {@code ventas_202601.txt},
 * {@code ventas202601.txt} y sus equivalentes para bloqueos.
 */
public final class CatalogoDatos {

    private static final Pattern VENTAS = Pattern.compile("ventas[._-]?(\\d{6})\\.txt", Pattern.CASE_INSENSITIVE);
    private static final Pattern BLOQUEO = Pattern.compile("bloqueos?[._-]?(\\d{4,6})\\.txt", Pattern.CASE_INSENSITIVE);
    private static final Pattern MANT = Pattern.compile(".*mant.*preventivo.*\\.txt", Pattern.CASE_INSENSITIVE);

    private final Path raiz;
    private final Map<String, Path> ventasPorMes = new TreeMap<>();
    private final Map<String, Path> bloqueosPorMes = new TreeMap<>();
    private Path mantenimiento;

    public CatalogoDatos(Path raiz) {
        this.raiz = raiz;
        indexar();
    }

    private void indexar() {
        try (Stream<Path> archivos = Files.walk(raiz)) {
            archivos.filter(Files::isRegularFile).forEach(p -> {
                String nombre = p.getFileName().toString();
                Matcher mv = VENTAS.matcher(nombre);
                if (mv.matches()) {
                    ventasPorMes.putIfAbsent(mv.group(1), p);
                    return;
                }
                Matcher mb = BLOQUEO.matcher(nombre);
                if (mb.matches()) {
                    bloqueosPorMes.putIfAbsent(normalizarMes(mb.group(1)), p);
                    return;
                }
                if (MANT.matcher(nombre).matches() && mantenimiento == null) {
                    mantenimiento = p;
                }
            });
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo recorrer " + raiz, e);
        }
    }

    /** {@code 2601} y {@code 202601} designan el mismo mes. */
    private static String normalizarMes(String crudo) {
        return crudo.length() == 4 ? "20" + crudo : crudo;
    }

    public List<String> mesesDisponibles() {
        List<String> out = new ArrayList<>();
        for (String mes : ventasPorMes.keySet()) {
            if (bloqueosPorMes.containsKey(mes)) {
                out.add(mes);
            }
        }
        return out;
    }

    public Optional<Path> ventas(String mes) {
        return Optional.ofNullable(ventasPorMes.get(normalizarMes(mes)));
    }

    public Optional<Path> bloqueos(String mes) {
        return Optional.ofNullable(bloqueosPorMes.get(normalizarMes(mes)));
    }

    public Optional<Path> mantenimiento() {
        return Optional.ofNullable(mantenimiento);
    }

    /**
     * Arma el escenario de un mes.
     *
     * @param mes       {@code 202601} o {@code 2601}
     * @param diasMes   días a simular; {@code 0} usa los días reales del calendario
     * @param diasExtra colchón para que cierren las entregas del último día
     */
    public EscenarioOperativo escenario(String mes, int diasMes, int diasExtra, ConfiguracionDominio cfg) {
        return escenario(mes, diasMes, diasExtra, cfg, true);
    }

    /**
     * @param proyectarMantenimiento {@code true} proyecta por día del mes el único plan
     *                               de mantenimiento disponible (set–oct 2026) sobre
     *                               cualquier mes; {@code false} solo programa taller en
     *                               los meses que el archivo cubre realmente
     */
    public EscenarioOperativo escenario(String mes, int diasMes, int diasExtra,
                                        ConfiguracionDominio cfg,
                                        boolean proyectarMantenimiento) {
        String clave = normalizarMes(mes);
        Path pv = ventas(clave).orElseThrow(() -> new IllegalArgumentException(
                "Sin archivo de ventas para " + clave + " bajo " + raiz));
        Path pb = bloqueos(clave).orElseThrow(() -> new IllegalArgumentException(
                "Sin archivo de bloqueos para " + clave + " bajo " + raiz));
        Path pm = mantenimiento().orElseThrow(() -> new IllegalArgumentException(
                "Sin archivo de mantenimiento preventivo bajo " + raiz));

        List<Pedido> todos = LectorVentas.leer(pv);
        int dias = diasMes > 0 ? diasMes : diasSimulables(clave, todos);
        List<Pedido> delRango = new ArrayList<>(todos.size());
        int limite = dias * 1440;
        for (Pedido p : todos) {
            if (p.minutoRegistro() < limite) {
                delRango.add(p);
            }
        }
        // Reindexar para que el id vuelva a ser la posición dentro del rango simulado.
        for (int i = 0; i < delRango.size(); i++) {
            delRango.get(i).asignarId(i);
        }

        List<Bloqueo> bloqueos = LectorBloqueos.leer(pb);
        LectorMantenimiento.PlanMantenimiento plan =
                LectorMantenimiento.leer(pm, dias, clave, proyectarMantenimiento);

        return new EscenarioOperativo(clave, cfg, delRango, bloqueos,
                plan.codigosFlota(), new HashMap<>(plan.porDia()), dias, diasExtra);
    }

    /**
     * Días que tiene sentido simular de un mes.
     *
     * <p>Los archivos de ventas entregados están cortados a 5 000 registros, así que
     * a partir de cierto mes la demanda se interrumpe a media marcha. Simular el mes
     * "completo" en ese caso mediría una cola que se vacía sola. Cuando el archivo no
     * llega al último día del calendario, el horizonte se recorta al último día del
     * que sí hay demanda completa.</p>
     */
    public static int diasSimulables(String mes, List<Pedido> pedidos) {
        int reales = diasReales(mes);
        if (pedidos.isEmpty()) {
            return reales;
        }
        int ultimoDiaConDatos = 0;
        for (Pedido p : pedidos) {
            ultimoDiaConDatos = Math.max(ultimoDiaConDatos, p.minutoRegistro() / 1440 + 1);
        }
        if (ultimoDiaConDatos >= reales) {
            return reales;
        }
        // El último día presente está cortado a media jornada: se descarta.
        return Math.max(1, ultimoDiaConDatos - 1);
    }

    public static int diasReales(String mes) {
        String m = normalizarMes(mes);
        return YearMonth.of(Integer.parseInt(m.substring(0, 4)), Integer.parseInt(m.substring(4, 6)))
                .lengthOfMonth();
    }

    public Path raiz() {
        return raiz;
    }
}
