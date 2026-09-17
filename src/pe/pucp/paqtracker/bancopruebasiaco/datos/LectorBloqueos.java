package pe.pucp.paqtracker.bancopruebasiaco.datos;

import pe.pucp.paqtracker.bancopruebasiaco.modelo.Bloqueo;
import pe.pucp.paqtracker.bancopruebasiaco.modelo.Nodo;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lee el archivo de bloqueos del mes.
 *
 * <p>Formato: {@code ##d##h##m-##d##h##m:x1,y1,x2,y2,...} — la lista de coordenadas
 * es la polilínea de tramos cortados durante ese intervalo.</p>
 */
public final class LectorBloqueos {

    private static final Pattern LINEA = Pattern.compile(
            "(\\d+)d(\\d+)h(\\d+)m-(\\d+)d(\\d+)h(\\d+)m:(.+)");

    private LectorBloqueos() {
    }

    public static List<Bloqueo> leer(Path archivo) {
        List<Bloqueo> bloqueos = new ArrayList<>();
        try {
            for (String linea : Files.readAllLines(archivo, StandardCharsets.UTF_8)) {
                String l = linea.trim();
                if (l.isEmpty()) {
                    continue;
                }
                Matcher m = LINEA.matcher(l);
                if (!m.matches()) {
                    throw new IllegalArgumentException("Línea de bloqueo no reconocida: " + l);
                }
                int inicio = LectorVentas.minutoDelMes(
                        Integer.parseInt(m.group(1)),
                        Integer.parseInt(m.group(2)),
                        Integer.parseInt(m.group(3)));
                int fin = LectorVentas.minutoDelMes(
                        Integer.parseInt(m.group(4)),
                        Integer.parseInt(m.group(5)),
                        Integer.parseInt(m.group(6)));
                String[] partes = m.group(7).split(",");
                List<Nodo> vertices = new ArrayList<>(partes.length / 2);
                for (int i = 0; i + 1 < partes.length; i += 2) {
                    vertices.add(new Nodo(Integer.parseInt(partes[i].trim()),
                            Integer.parseInt(partes[i + 1].trim())));
                }
                bloqueos.add(Bloqueo.deVertices(inicio, fin, vertices));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer " + archivo, e);
        }
        return bloqueos;
    }
}
