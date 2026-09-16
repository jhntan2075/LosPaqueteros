package pe.pucp.paqtracker.iaco.servicio;

import pe.pucp.paqtracker.iaco.modelo.Almacen;
import pe.pucp.paqtracker.iaco.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.iaco.modelo.Pedido;
import pe.pucp.paqtracker.iaco.modelo.TipoVehiculo;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cota optimista de cumplimiento: ¿existe <i>algún</i> plan capaz de entregar el
 * pedido a tiempo?
 *
 * <p>Relaja todo lo relajable —cualquier almacén, el vehículo más rápido con
 * capacidad suficiente, el mejor grupo de refrigerio y cualquier salida desde el
 * primer ciclo— y responde en dos niveles: {@code TURNO} cuando ni siquiera sin
 * bloqueos alcanza, y {@code BLOQUEO} cuando solo los cortes viales lo impiden.</p>
 *
 * <p>Sirve para separar los tardíos que el planificador podría haber evitado de los
 * que son imposibles por construcción del escenario.</p>
 */
public final class AnalizadorFactibilidad {

    public enum Causa { TURNO, BLOQUEO }

    /** @param atrasoMinimo minutos de atraso del mejor plan imaginable */
    public record Imposible(int idPedido, Causa causa, long atrasoMinimo) {}

    private final ConfiguracionDominio cfg;
    private final CalendarioOperativo cal;
    private final Ciudad ciudad;
    private final int ciclo;

    public AnalizadorFactibilidad(ConfiguracionDominio cfg, Ciudad ciudad, int ciclo) {
        this.cfg = cfg;
        this.cal = new CalendarioOperativo(cfg);
        this.ciudad = ciudad;
        this.ciclo = ciclo;
    }

    /** Mejor minuto de fin alcanzable ignorando bloqueos. */
    public double mejorFin(Pedido p) {
        double t0 = Math.ceil(p.minutoRegistro() / (double) ciclo) * ciclo;
        double mejor = Double.POSITIVE_INFINITY;
        for (Almacen a : cfg.almacenes()) {
            for (TipoVehiculo tv : TipoVehiculo.values()) {
                ConfiguracionDominio.PerfilVehiculo perfil = cfg.perfil(tv);
                if (perfil.capacidad() < p.cantidad()) {
                    continue;
                }
                double v = perfil.velocidadKmH();
                for (int idx = 0; idx < cfg.gruposRefrigerio(); idx++) {
                    double ts = t0;
                    for (int intento = 0; intento < 4; intento++) {
                        double llegada = cal.avanzar(idx, ts,
                                a.nodo().manhattan(p.destino()) * 60.0 / v);
                        double fin = cal.avanzar(idx, llegada, cfg.minutosEntrega());
                        double ret = cal.avanzar(idx, fin,
                                cfg.distanciaAlAlmacenMasCercano(p.destino()) * 60.0 / v);
                        if (ret <= cal.turnoFin(ts)) {
                            mejor = Math.min(mejor, fin);
                            break;
                        }
                        ts = cal.turnoFin(ts);
                    }
                }
            }
        }
        return mejor;
    }

    /** Mejor minuto de fin alcanzable con los bloqueos vigentes y rutas reales. */
    public double mejorFinConBloqueos(Pedido p) {
        double t0 = Math.ceil(p.minutoRegistro() / (double) ciclo) * ciclo;
        double mejor = Double.POSITIVE_INFINITY;
        for (Almacen a : cfg.almacenes()) {
            for (TipoVehiculo tv : TipoVehiculo.values()) {
                ConfiguracionDominio.PerfilVehiculo perfil = cfg.perfil(tv);
                if (perfil.capacidad() < p.cantidad()) {
                    continue;
                }
                double v = perfil.velocidadKmH();
                for (int idx = 0; idx < cfg.gruposRefrigerio(); idx++) {
                    for (double ts = t0; ts <= p.minutoLimite(); ts += ciclo) {
                        Ciudad.Tramo ida = ciudad.tramo(a.nodo(), p.destino(), ts, v);
                        if (Double.isInfinite(ida.minutoLlegada())) {
                            continue;
                        }
                        double llegada = cal.avanzar(idx, ts, ida.minutoLlegada() - ts);
                        double fin = cal.avanzar(idx, llegada, cfg.minutosEntrega());
                        double vuelta = Double.POSITIVE_INFINITY;
                        for (Almacen b : cfg.almacenes()) {
                            Ciudad.Tramo tr = ciudad.tramo(p.destino(), b.nodo(), fin, v);
                            vuelta = Math.min(vuelta, tr.minutoLlegada() - fin);
                        }
                        if (cal.avanzar(idx, fin, vuelta) <= cal.turnoFin(ts)) {
                            mejor = Math.min(mejor, fin);
                        }
                    }
                }
            }
        }
        return mejor;
    }

    /**
     * Pedidos que ningún planificador podría entregar a tiempo.
     *
     * @param plazoMaximo plazos mayores se dan por factibles sin analizar (siempre
     *                    tienen margen) — {@code 8} en el banco de pruebas
     */
    public Map<Integer, Imposible> imposibles(List<Pedido> pedidos, int plazoMaximo) {
        Map<Integer, Imposible> out = new LinkedHashMap<>();
        for (Pedido p : pedidos) {
            if (p.plazoHoras() > plazoMaximo) {
                continue;
            }
            double sinBloqueos = mejorFin(p);
            if (sinBloqueos > p.minutoLimite()) {
                out.put(p.id(), new Imposible(p.id(), Causa.TURNO,
                        Math.round(sinBloqueos - p.minutoLimite())));
                continue;
            }
            double conBloqueos = mejorFinConBloqueos(p);
            if (conBloqueos > p.minutoLimite()) {
                out.put(p.id(), new Imposible(p.id(), Causa.BLOQUEO,
                        Double.isInfinite(conBloqueos) ? -1
                                : Math.round(conBloqueos - p.minutoLimite())));
            }
        }
        return out;
    }
}
