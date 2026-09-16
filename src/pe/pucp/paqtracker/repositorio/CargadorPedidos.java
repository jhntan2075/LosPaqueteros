package pe.pucp.paqtracker.repositorio;

import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Lee el archivo de pedidos del proyecto. Cada linea tiene el formato
 * reg_min,x,y,cantidad,plazo_min, donde reg_min es el instante de registro en
 * minutos absolutos del mes.
 */
public final class CargadorPedidos {

    private static final int CAMPOS_ESPERADOS = 5;

    /**
     * Carga los pedidos registrados antes del horizonte indicado.
     *
     * @param ruta      ruta del archivo de pedidos
     * @param horizonte minuto absoluto limite; se ignoran los pedidos posteriores
     * @return lista de pedidos cargados
     * @throws IOException si ocurre un error de lectura del archivo
     */
    public static List<Pedido> cargar(String ruta, int horizonte) throws IOException {
        List<Pedido> pedidos = new ArrayList<>();
        int id = 0;
        try (BufferedReader lector = new BufferedReader(new FileReader(ruta))) {
            String linea;
            while ((linea = lector.readLine()) != null) {
                linea = linea.trim();
                if (linea.isEmpty() || linea.startsWith("#")) {
                    continue;
                }
                Pedido pedido = parsearLinea(linea, id, horizonte);
                if (pedido != null) {
                    pedidos.add(pedido);
                    id++;
                }
            }
        }
        return pedidos;
    }

    /**
     * Parsea una linea del archivo en un pedido, o null si esta fuera del
     * horizonte.
     *
     * @param linea     linea a parsear
     * @param id        identificador a asignar
     * @param horizonte minuto absoluto limite
     * @return pedido parseado, o null si su registro supera el horizonte
     */
    private static Pedido parsearLinea(String linea, int id, int horizonte) {
        String[] campos = linea.split(",");
        if (campos.length < CAMPOS_ESPERADOS) {
            throw new IllegalArgumentException("Linea de pedido invalida: " + linea);
        }
        int registro = Integer.parseInt(campos[0].trim());
        if (registro >= horizonte) {
            return null;
        }
        int x = Integer.parseInt(campos[1].trim());
        int y = Integer.parseInt(campos[2].trim());
        int cantidad = Integer.parseInt(campos[3].trim());
        int plazo = Integer.parseInt(campos[4].trim());
        return new Pedido(id, new Nodo(x, y), cantidad, registro, plazo);
    }

    private CargadorPedidos() {
    }
}
