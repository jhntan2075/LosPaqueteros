package pe.pucp.paqtracker.iaco.datos;

import pe.pucp.paqtracker.iaco.modelo.Bloqueo;
import pe.pucp.paqtracker.iaco.modelo.Pedido;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Inventario de los archivos de entrada.
 *
 * <p>Antes de interpretar cualquier resultado hay que saber qué trae cada mes. Los
 * archivos de ventas entregados están cortados en 5 000 registros, así que a partir
 * de cierto mes la demanda se interrumpe a media jornada: el último día aparece con
 * una fracción de los pedidos que traen los días anteriores. Este auditor lo detecta
 * comparando el último día contra la mediana de los días previos.</p>
 */
public final class AuditorDatos {

    /**
     * @param ultimoDiaParcial el archivo se corta a media jornada del último día
     * @param diasUtiles       días con demanda completa, que es lo que se simula
     */
    public record ResumenMes(String mes,
                             int pedidos,
                             int primerDia,
                             int ultimoDia,
                             int diasCalendario,
                             int diasUtiles,
                             int pedidosUltimoDia,
                             int medianaPedidosPorDia,
                             boolean ultimoDiaParcial,
                             boolean mesIncompleto,
                             double pedidosPorDiaUtil,
                             double cantidadMedia,
                             int bloqueos) {}

    private final CatalogoDatos catalogo;

    public AuditorDatos(CatalogoDatos catalogo) {
        this.catalogo = catalogo;
    }

    public List<ResumenMes> auditar() {
        List<ResumenMes> out = new ArrayList<>();
        for (String mes : catalogo.mesesDisponibles()) {
            out.add(auditarMes(mes));
        }
        return out;
    }

    public ResumenMes auditarMes(String mes) {
        Path pv = catalogo.ventas(mes).orElseThrow();
        List<Pedido> pedidos = LectorVentas.leer(pv);
        int diasCalendario = CatalogoDatos.diasReales(mes);

        int[] porDia = new int[diasCalendario + 2];
        int primerDia = Integer.MAX_VALUE;
        int ultimoDia = 0;
        long sumaCantidad = 0;
        for (Pedido p : pedidos) {
            int dia = p.minutoRegistro() / 1440 + 1;
            if (dia < porDia.length) {
                porDia[dia]++;
            }
            primerDia = Math.min(primerDia, dia);
            ultimoDia = Math.max(ultimoDia, dia);
            sumaCantidad += p.cantidad();
        }
        if (pedidos.isEmpty()) {
            primerDia = 0;
        }

        // Mediana de los días anteriores al último, que es la referencia de un día "lleno".
        List<Integer> completos = new ArrayList<>();
        for (int d = primerDia; d < ultimoDia; d++) {
            completos.add(porDia[d]);
        }
        completos.sort(Integer::compareTo);
        int mediana = completos.isEmpty() ? 0 : completos.get(completos.size() / 2);

        int ultimoConteo = ultimoDia > 0 ? porDia[ultimoDia] : 0;
        // Si el archivo no llega al último día del calendario, está cortado: el día en
        // que se corta es siempre parcial, caiga donde caiga dentro de la jornada. Se
        // usa exactamente el mismo criterio que el simulador, para que la columna de
        // días útiles diga lo que realmente se simula.
        boolean incompleto = ultimoDia < diasCalendario;
        int diasUtiles = CatalogoDatos.diasSimulables(mes, pedidos);
        boolean parcial = incompleto && mediana > 0 && ultimoConteo < mediana;

        int pedidosEnVentana = 0;
        for (int d = 1; d <= diasUtiles && d < porDia.length; d++) {
            pedidosEnVentana += porDia[d];
        }

        Optional<Path> pb = catalogo.bloqueos(mes);
        int nBloqueos = 0;
        if (pb.isPresent()) {
            List<Bloqueo> bloqueos = LectorBloqueos.leer(pb.get());
            nBloqueos = bloqueos.size();
        }

        return new ResumenMes(mes, pedidos.size(), primerDia, ultimoDia, diasCalendario,
                diasUtiles, ultimoConteo, mediana, parcial, incompleto,
                diasUtiles == 0 ? 0 : (double) pedidosEnVentana / diasUtiles,
                pedidos.isEmpty() ? 0 : (double) sumaCantidad / pedidos.size(),
                nBloqueos);
    }
}
