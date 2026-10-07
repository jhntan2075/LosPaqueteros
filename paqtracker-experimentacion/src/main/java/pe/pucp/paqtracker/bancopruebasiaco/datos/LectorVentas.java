package pe.pucp.paqtracker.bancopruebasiaco.datos;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Nodo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Pedido;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee el archivo de ventas del mes.
 *
 * <p>Formato: {@code ##d##h##m:x,y,cIIIIII,cant,plazoH} — por ejemplo
 * {@code 01d01h30m:56,30,c4910,02,36}.</p>
 */
public final class LectorVentas {

    private static final Pattern LINEA = Pattern.compile(
            "(\\d+)d(\\d+)h(\\d+)m:(\\d+),(\\d+),(c\\d+),(\\d+),(\\d+)");

    private LectorVentas() {
    }

    public static List<Pedido> leer(Path archivo) {
        List<Pedido> pedidos = new ArrayList<>();
        try {
            for (String linea : Files.readAllLines(archivo, StandardCharsets.UTF_8)) {
                String l = linea.trim();
                if (l.isEmpty()) {
                    continue;
                }
                Matcher m = LINEA.matcher(l);
                if (!m.matches()) {
                    throw new IllegalArgumentException("Línea de ventas no reconocida: " + l);
                }
                int minuto = minutoDelMes(
                        Integer.parseInt(m.group(1)),
                        Integer.parseInt(m.group(2)),
                        Integer.parseInt(m.group(3)));
                Nodo destino = new Nodo(Integer.parseInt(m.group(4)), Integer.parseInt(m.group(5)));
                pedidos.add(new Pedido(0, minuto, destino, m.group(6),
                        Integer.parseInt(m.group(7)), Integer.parseInt(m.group(8))));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer " + archivo, e);
        }
        // El id es el orden cronológico de registro: así lo espera el resto del sistema.
        pedidos.sort(Comparator.comparingInt(Pedido::minutoRegistro));
        for (int i = 0; i < pedidos.size(); i++) {
            pedidos.get(i).asignarId(i);
        }
        return pedidos;
    }

    /** Minuto absoluto desde el inicio del mes (el día 1 empieza en el minuto 0). */
    public static int minutoDelMes(int dia, int hora, int minuto) {
        return (dia - 1) * 1440 + hora * 60 + minuto;
    }
}
