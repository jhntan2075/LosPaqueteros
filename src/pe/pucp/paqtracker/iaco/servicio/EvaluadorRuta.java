package pe.pucp.paqtracker.iaco.servicio;

import pe.pucp.paqtracker.iaco.modelo.Almacen;
import pe.pucp.paqtracker.iaco.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.iaco.modelo.Nodo;
import pe.pucp.paqtracker.iaco.modelo.Pedido;
import pe.pucp.paqtracker.iaco.modelo.Ruta;
import pe.pucp.paqtracker.iaco.modelo.RutaNoFactibleException;
import pe.pucp.paqtracker.iaco.modelo.Unidad;

/**
 * Cronometra rutas: recorre las paradas, aplica el tiempo de entrega (LE-025),
 * salta refrigerios (LE-024) y cierra con el regreso al almacén más cercano.
 *
 * <p>Dos modos, igual que en el banco de pruebas: {@link #estimar} usa distancia
 * Manhattan y es el que emplea la colonia dentro del bucle de búsqueda, mientras
 * que {@link #real} resuelve cada tramo con A* sobre los bloqueos vigentes y es el
 * que decide el despacho.</p>
 */
public final class EvaluadorRuta {

    private final ConfiguracionDominio cfg;
    private final CalendarioOperativo calendario;
    private final Ciudad ciudad;

    public EvaluadorRuta(ConfiguracionDominio cfg, CalendarioOperativo calendario, Ciudad ciudad) {
        this.cfg = cfg;
        this.calendario = calendario;
        this.ciudad = ciudad;
    }

    /** Cronograma optimista (sin bloqueos). Devuelve el atraso total en minutos. */
    public double estimar(Ruta r) {
        return cronometrar(r, false);
    }

    /** Cronograma con bloqueos vigentes. Devuelve el atraso total en minutos. */
    public double real(Ruta r) {
        return cronometrar(r, true);
    }

    /**
     * Atraso real más el exceso sobre el fin de turno: la métrica con la que el
     * pulido final decide si una ruta es despachable tal cual.
     */
    public double penalizacionReal(Ruta r) {
        double atraso = real(r);
        return atraso + Math.max(0.0, r.minutoFin() - calendario.turnoFin(r.minutoSalida()));
    }

    private double cronometrar(Ruta r, boolean conBloqueos) {
        Unidad u = r.unidad();
        int idx = u.indice();
        double velocidad = u.velocidad();
        double minPorKm = u.minutosPorKm();

        int n = r.tamano();
        double[] llegadas = r.bufferLlegadas(n);
        double[] fines = r.bufferFines(n);

        double t = r.minutoSalida();
        Nodo pos = r.origen();
        double km = 0.0;
        double atraso = 0.0;

        for (int i = 0; i < n; i++) {
            Pedido p = r.pedidos().get(i);
            double llegada;
            if (conBloqueos) {
                Ciudad.Tramo tramo = ciudad.tramo(pos, p.destino(), t, velocidad);
                if (Double.isInfinite(tramo.minutoLlegada())) {
                    throw new RutaNoFactibleException(
                            "Tramo sin recorrido posible hacia el pedido " + p.id());
                }
                km += tramo.km();
                llegada = calendario.avanzar(idx, t, tramo.minutoLlegada() - t);
            } else {
                int d = pos.manhattan(p.destino());
                km += d;
                llegada = calendario.avanzar(idx, t, d * minPorKm);
            }
            t = calendario.avanzar(idx, llegada, cfg.minutosEntrega());
            llegadas[i] = llegada;
            fines[i] = t;
            if (t > p.minutoLimite()) {
                atraso += t - p.minutoLimite();
            }
            pos = p.destino();
        }

        Almacen retorno = cfg.almacenMasCercano(pos);
        if (conBloqueos) {
            Ciudad.Tramo tramo = ciudad.tramo(pos, retorno.nodo(), t, velocidad);
            if (Double.isInfinite(tramo.minutoLlegada())) {
                throw new RutaNoFactibleException("Sin regreso posible a " + retorno.codigo());
            }
            km += tramo.km();
            t = calendario.avanzar(idx, t, tramo.minutoLlegada() - t);
        } else {
            int d = pos.manhattan(retorno.nodo());
            km += d;
            t = calendario.avanzar(idx, t, d * minPorKm);
        }

        r.fijarCronograma(km, t, retorno);
        return atraso;
    }

    /** Número de entregas fuera de plazo de una ruta ya cronometrada. */
    public int incumplimientos(Ruta r) {
        int n = 0;
        for (int i = 0; i < r.tamano(); i++) {
            if (r.minutoFinParada(i) > r.pedidos().get(i).minutoLimite()) {
                n++;
            }
        }
        return n;
    }

    /** ¿La ruta desborda el turno en el que arranca? (LE-023) */
    public boolean desbordaTurno(Ruta r) {
        return r.minutoFin() > calendario.turnoFin(r.minutoSalida()) + 1e-6;
    }

    public CalendarioOperativo calendario() {
        return calendario;
    }

    public ConfiguracionDominio configuracion() {
        return cfg;
    }

    public Ciudad ciudad() {
        return ciudad;
    }
}
