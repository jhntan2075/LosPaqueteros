package pe.pucp.paqtracker.modelo;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Evento de averia registrado manualmente por el operador (no hay archivo
 * oficial del curso para averias, a diferencia de pedidos y bloqueos):
 * en que instante se averia que unidad, y con que severidad. A diferencia de
 * un {@link Bloqueo}, una averia es un instante puntual, no un intervalo de
 * vigencia; las ventanas de recuperacion se calculan en el orquestador a
 * partir del tipo, no se guardan aqui.
 */
public final class Averia {

    private static final int CAMPOS_ESPERADOS = 3;
    private static final Pattern PATRON_TIEMPO = Pattern.compile("(\\d+)d(\\d+)h(\\d+)m");
    private static final int MINUTOS_POR_DIA = 1440;
    private static final int MINUTOS_POR_HORA = 60;

    private final int instante;
    private final int idVehiculo;
    private final TipoAveria tipo;

    /**
     * @param instante   minuto absoluto en que ocurre la averia
     * @param idVehiculo identificador de la unidad afectada
     * @param tipo       severidad de la averia
     */
    public Averia(int instante, int idVehiculo, TipoAveria tipo) {
        this.instante = instante;
        this.idVehiculo = idVehiculo;
        this.tipo = tipo;
    }

    /**
     * Interpreta una averia registrada manualmente en la linea de comandos,
     * con el formato {@code diaDhoraHminutoM,idVehiculo,tipo} (dia 1-indexado
     * desde el inicio de la simulacion, tipo en {1, 2, 3}).
     *
     * @param texto averia en formato {@code instante,idVehiculo,tipo}
     * @return la averia interpretada
     * @throws IllegalArgumentException si el texto no respeta el formato esperado
     */
    public static Averia parsear(String texto) {
        String[] campos = texto.split(",");
        if (campos.length != CAMPOS_ESPERADOS) {
            throw new IllegalArgumentException("Averia invalida: " + texto);
        }
        int instante = minutosDesde(campos[0].trim());
        int idVehiculo = Integer.parseInt(campos[1].trim());
        TipoAveria tipo = tipoDesde(campos[2].trim());
        return new Averia(instante, idVehiculo, tipo);
    }

    private static int minutosDesde(String texto) {
        Matcher matcher = PATRON_TIEMPO.matcher(texto);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Marca de tiempo invalida: " + texto);
        }
        int dia = Integer.parseInt(matcher.group(1));
        int hora = Integer.parseInt(matcher.group(2));
        int minuto = Integer.parseInt(matcher.group(3));
        return (dia - 1) * MINUTOS_POR_DIA + hora * MINUTOS_POR_HORA + minuto;
    }

    private static TipoAveria tipoDesde(String texto) {
        return switch (texto) {
            case "1" -> TipoAveria.TIPO_1;
            case "2" -> TipoAveria.TIPO_2;
            case "3" -> TipoAveria.TIPO_3;
            default -> throw new IllegalArgumentException("Tipo de averia invalido: " + texto);
        };
    }

    public int getInstante() {
        return instante;
    }

    public int getIdVehiculo() {
        return idVehiculo;
    }

    public TipoAveria getTipo() {
        return tipo;
    }

    @Override
    public String toString() {
        return "Averia " + tipo + " unidad#" + idVehiculo + " en t=" + instante;
    }
}
