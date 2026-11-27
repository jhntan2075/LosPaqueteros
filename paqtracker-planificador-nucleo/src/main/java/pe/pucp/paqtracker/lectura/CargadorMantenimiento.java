package pe.pucp.paqtracker.lectura;

import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee el plan de mantenimiento preventivo ({@code mant.preventivo.*.txt}): una linea {@code aaaammdd:UNIDAD}
 * por intervencion, donde la unidad es {@code TA01} (auto), {@code TM07} (moto) o {@code TB11} (bicicleta).
 * La unidad {@code TA01} es la {@code A-01} de la flota: el primer auto en el orden de creacion.
 */
public final class CargadorMantenimiento {

    private static final Pattern LINEA = Pattern.compile("(\\d{8}):T([ABM])(\\d{1,4})");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("uuuuMMdd")
            .withResolverStyle(ResolverStyle.STRICT);

    private CargadorMantenimiento() {
    }

    /**
     * Una intervencion del plan.
     *
     * @param fecha       dia que la unidad pasa en el taller
     * @param tipo        tipo de la unidad
     * @param correlativo numero de la unidad dentro de su tipo, desde 1
     */
    public record LineaMantenimiento(LocalDate fecha, TipoVehiculo tipo, int correlativo) {

        /**
         * @return codigo de la unidad en el archivo, como {@code TA01}
         */
        public String codigoArchivo() {
            return String.format(Locale.ROOT, "T%s%02d", letra(tipo), correlativo);
        }
    }

    /**
     * @param lineas lineas del archivo, en orden
     * @return intervenciones en el orden del archivo; ignora lineas vacias y comentarios
     * @throws IllegalArgumentException si alguna linea no respeta el formato o se repite
     */
    public static List<LineaMantenimiento> leer(List<String> lineas) {
        ResultadoValidacion validacion = validar(lineas);
        if (!validacion.esValido()) {
            throw new IllegalArgumentException(String.join("; ", validacion.getErrores()));
        }
        List<LineaMantenimiento> leidas = new ArrayList<>();
        for (String original : lineas) {
            String linea = original.trim();
            if (!linea.isEmpty() && !linea.startsWith("#")) {
                leidas.add(parsear(linea));
            }
        }
        return leidas;
    }

    /**
     * Valida todas las lineas sin cortar en la primera invalida, para informar todo lo que hay que corregir.
     *
     * @param lineas lineas del archivo, en orden
     * @return intervenciones validas y una descripcion por linea rechazada
     */
    public static ResultadoValidacion validar(List<String> lineas) {
        int validos = 0;
        List<String> errores = new ArrayList<>();
        List<Integer> invalidas = new ArrayList<>();
        Set<LineaMantenimiento> vistas = new HashSet<>();
        for (int i = 0; i < lineas.size(); i++) {
            String linea = lineas.get(i).trim();
            if (linea.isEmpty() || linea.startsWith("#")) {
                continue;
            }
            try {
                LineaMantenimiento leida = parsear(linea);
                if (!vistas.add(leida)) {
                    throw new IllegalArgumentException("la unidad " + leida.codigoArchivo()
                            + " ya tiene mantenimiento el " + leida.fecha());
                }
                validos++;
            } catch (IllegalArgumentException excepcion) {
                errores.add("Linea " + (i + 1) + ": " + excepcion.getMessage());
                invalidas.add(i + 1);
            }
        }
        return new ResultadoValidacion(validos, errores, invalidas);
    }

    private static LineaMantenimiento parsear(String linea) {
        Matcher coincidencia = LINEA.matcher(linea);
        if (!coincidencia.matches()) {
            throw new IllegalArgumentException("se esperaba aaaammdd:TA01, TM01 o TB01 y se leyo \"" + linea + "\"");
        }
        LocalDate fecha;
        try {
            fecha = LocalDate.parse(coincidencia.group(1), FECHA);
        } catch (DateTimeException excepcion) {
            throw new IllegalArgumentException("fecha inexistente " + coincidencia.group(1), excepcion);
        }
        int correlativo = Integer.parseInt(coincidencia.group(3));
        if (correlativo < 1) {
            throw new IllegalArgumentException("el numero de unidad empieza en 1: " + linea);
        }
        return new LineaMantenimiento(fecha, tipoDe(coincidencia.group(2)), correlativo);
    }

    private static TipoVehiculo tipoDe(String letra) {
        return switch (letra) {
            case "A" -> TipoVehiculo.AUTO;
            case "M" -> TipoVehiculo.MOTOCICLETA;
            default -> TipoVehiculo.BICICLETA;
        };
    }

    private static String letra(TipoVehiculo tipo) {
        return switch (tipo) {
            case AUTO -> "A";
            case MOTOCICLETA -> "M";
            case BICICLETA -> "B";
        };
    }
}
