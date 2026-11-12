package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.lectura.CargadorBloqueos;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Nodo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.EstadoAvance;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidos;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidos.PedidoFuente;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import pe.pucp.paqtracker.util.RangoFechas;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Arma los datos de una ejecucion: los pedidos salen de la base (archivos del sistema, manuales o el lote de
 * una corrida) y los bloqueos de la carpeta configurada. Todo se ubica en la linea de tiempo de la ejecucion
 * (minuto cero = medianoche de su primer dia).
 */
@Component
public class CargadorDatosEscenario {

    private static final int MINUTOS_POR_DIA = 1440;
    private static final int SEGUNDOS_POR_MINUTO = 60;
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");

    private final PuertoPedidos pedidos;
    private final String carpetaBloqueos;
    private final ZoneId zona;

    /**
     * @param pedidos     pedidos guardados
     * @param propiedades parametros de la operacion
     */
    public CargadorDatosEscenario(PuertoPedidos pedidos, PropiedadesDominio propiedades) {
        this.pedidos = pedidos;
        this.carpetaBloqueos = propiedades.datos().bloqueos();
        this.zona = ZoneId.of(propiedades.ejecucion().zonaHoraria());
    }

    /**
     * Datos de la operacion dia a dia del mes en curso. Los pedidos (del sistema y manuales) se eligen por su
     * avance guardado: los anteriores al primer arranque del mes no se operaron; los ya entregados no vuelven;
     * los pendientes con plazo vigente entran con lo que les falta; los vencidos se devuelven aparte para
     * marcarlos incumplidos. Los posteriores al arranque entran enteros.
     *
     * @param ahora           fecha y hora real del arranque
     * @param inicioOperacion primer arranque del dia a dia en este mes
     * @return datos del mes y pedidos que vencieron con la API detenida
     */
    public CargaDiaADia cargarDiaADia(ZonedDateTime ahora, Instant inicioOperacion) {
        YearMonth mes = YearMonth.from(ahora);
        LineaTiempo lineaTiempo = new LineaTiempo(mes.atDay(1).atStartOfDay(zona));
        int minutoInicial = (int) Math.floor(lineaTiempo.aMinuto(ahora));
        int horizonte = mes.lengthOfMonth() * MINUTOS_POR_DIA;
        Instant inicioMes = lineaTiempo.getMinutoCero().toInstant();
        Instant finMes = mes.plusMonths(1).atDay(1).atStartOfDay(zona).toInstant();
        List<PedidoFuente> fuentes = new ArrayList<>(pedidos.delSistema(inicioMes, finMes));
        fuentes.addAll(pedidos.manuales(inicioMes, finMes));
        SeleccionDiaADia seleccion = new SeleccionDiaADia(ahora.toInstant(), inicioOperacion);
        fuentes.forEach(fuente -> seleccion.evaluar(fuente, lineaTiempo, zona));
        List<Bloqueo> bloqueos = leerBloqueos(() -> CargadorBloqueos.cargar(carpetaBloqueos, mes.format(FORMATO_MES)),
                mes.format(FORMATO_MES));
        DatosEscenario datos = new DatosEscenario(lineaTiempo, minutoInicial, horizonte, seleccion.operables,
                bloqueos, DatosEscenario.ORIGEN_SISTEMA, Map.copyOf(seleccion.entregadas),
                ResultadoEjecucion.VACIO);
        return new CargaDiaADia(datos, List.copyOf(seleccion.vencidos));
    }

    /**
     * Datos de una simulacion de {@code dias} dias completos que arranca a una hora del primer dia. El minuto
     * cero es la medianoche del primer dia y el reloj parte en la hora pedida. Si se subio un archivo para la
     * corrida, sus pedidos reemplazan a los del sistema en el mes que trae; los demas meses salen del sistema.
     *
     * @param fechaInicio primer dia
     * @param horaInicio  hora del primer dia en la que arranca el reloj
     * @param dias        cantidad de dias
     * @param lote        lote de pedidos subido para la corrida, o null
     * @return datos del rango
     * @throws SolicitudInvalidaException si el lote no existe o el rango no tiene pedidos
     */
    public DatosEscenario cargarRango(LocalDate fechaInicio, LocalTime horaInicio, int dias, String lote) {
        int minutoInicial = horaInicio.toSecondOfDay() / SEGUNDOS_POR_MINUTO;
        int horizonte = minutoInicial + dias * MINUTOS_POR_DIA;
        LineaTiempo lineaTiempo = new LineaTiempo(fechaInicio.atStartOfDay(zona));
        ZonedDateTime desde = lineaTiempo.aFecha(minutoInicial);
        ZonedDateTime hasta = lineaTiempo.aFecha(horizonte);
        Set<YearMonth> mesesLote = mesesDelLote(lote, desde, hasta);
        List<Pedido> elegidos = new ArrayList<>();
        for (YearMonth mes = YearMonth.from(desde); mes.atDay(1).atStartOfDay(zona).isBefore(hasta);
             mes = mes.plusMonths(1)) {
            Instant inicio = max(desde, mes.atDay(1).atStartOfDay(zona)).toInstant();
            Instant fin = min(hasta, mes.plusMonths(1).atDay(1).atStartOfDay(zona)).toInstant();
            List<PedidoFuente> delMes = mesesLote.contains(mes) ? pedidos.delLote(lote, inicio, fin)
                    : pedidos.delSistema(inicio, fin);
            delMes.forEach(fuente -> elegidos.add(aPedido(fuente, fuente.cantidad(), lineaTiempo, zona)));
        }
        if (elegidos.isEmpty()) {
            throw new SolicitudInvalidaException("No hay pedidos entre " + fechaInicio + " " + horaInicio
                    + " y " + hasta.toLocalDate() + "; cargue el archivo de ventas del periodo");
        }
        RangoFechas rango = rangoDe(fechaInicio, horaInicio, dias);
        List<Bloqueo> bloqueos = leerBloqueos(() -> CargadorBloqueos.cargarEnRango(carpetaBloqueos, rango),
                fechaInicio.toString());
        return DatosEscenario.nuevos(lineaTiempo, minutoInicial, horizonte, elegidos, bloqueos,
                lote == null ? DatosEscenario.ORIGEN_SISTEMA : DatosEscenario.ORIGEN_ARCHIVO);
    }

    /**
     * Comprueba que haya pedidos para cada mes que toca el horizonte, del sistema o del lote de la corrida. Sin
     * ellos, la simulacion correria su tramo final sin pedidos, por ejemplo al arrancar a una hora tardia del
     * ultimo dia del mes, cuando el horizonte termina en el mes siguiente.
     *
     * @param fechaInicio primer dia
     * @param horaInicio  hora del primer dia en la que arranca el reloj
     * @param dias        cantidad de dias
     * @param lote        lote de pedidos subido para la corrida, o null
     * @throws SolicitudInvalidaException si a algun mes del horizonte le faltan pedidos
     */
    public void exigirVentasDelRango(LocalDate fechaInicio, LocalTime horaInicio, int dias, String lote) {
        RangoFechas rango = rangoDe(fechaInicio, horaInicio, dias);
        Set<YearMonth> disponibles = new HashSet<>(pedidos.mesesDelSistema());
        if (lote != null) {
            disponibles.addAll(pedidos.mesesDelLote(lote));
        }
        for (YearMonth mes = YearMonth.from(rango.getInicio()); !mes.isAfter(YearMonth.from(rango.getFin()));
             mes = mes.plusMonths(1)) {
            if (!disponibles.contains(mes)) {
                throw new SolicitudInvalidaException("Faltan los pedidos de " + mes.format(FORMATO_MES)
                        + " (archivo ventas." + mes.format(FORMATO_MES) + ".txt): la simulación de " + dias
                        + " días desde " + fechaInicio + " " + horaInicio + " llega hasta " + rango.getFin()
                        + "; suba ese archivo o elija otra fecha u hora de inicio");
            }
        }
    }

    /**
     * Datos del dia a dia y pedidos que vencieron sin entregarse mientras la API estaba detenida.
     *
     * @param datos    datos de la ejecucion
     * @param vencidos avance que marca incumplido a cada pedido vencido
     */
    public record CargaDiaADia(DatosEscenario datos, List<AvancePedido> vencidos) {
    }

    private Set<YearMonth> mesesDelLote(String lote, ZonedDateTime desde, ZonedDateTime hasta) {
        if (lote == null) {
            return Set.of();
        }
        Set<YearMonth> meses = pedidos.mesesDelLote(lote);
        if (meses.isEmpty()) {
            throw new SolicitudInvalidaException("El archivo de pedidos subido (" + lote
                    + ") no existe o ya lo usa otra simulación; vuelva a subirlo");
        }
        YearMonth primero = YearMonth.from(desde);
        YearMonth ultimo = YearMonth.from(hasta.minusMinutes(1));
        if (meses.stream().noneMatch(mes -> !mes.isBefore(primero) && !mes.isAfter(ultimo))) {
            throw new SolicitudInvalidaException("El archivo de pedidos subido es de " + meses.iterator().next()
                    + ", fuera del periodo de la simulación (" + primero + " a " + ultimo + ")");
        }
        return meses;
    }

    private static Pedido aPedido(PedidoFuente fuente, int cantidad, LineaTiempo lineaTiempo, ZoneId zona) {
        int registro = (int) Math.floor(lineaTiempo.aMinuto(fuente.registradoEn().atZone(zona)));
        return new Pedido(fuente.id(), new Nodo(fuente.x(), fuente.y()), cantidad, registro, fuente.plazoMinutos(),
                fuente.cliente());
    }

    private static ZonedDateTime max(ZonedDateTime a, ZonedDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    private static ZonedDateTime min(ZonedDateTime a, ZonedDateTime b) {
        return a.isBefore(b) ? a : b;
    }

    /** Dias que cubre el horizonte: uno mas si el reloj no arranca a la medianoche. */
    private static RangoFechas rangoDe(LocalDate fechaInicio, LocalTime horaInicio, int dias) {
        boolean medianoche = horaInicio.toSecondOfDay() < SEGUNDOS_POR_MINUTO;
        return RangoFechas.de(fechaInicio, fechaInicio.plusDays(medianoche ? dias - 1L : dias));
    }

    private static List<Bloqueo> leerBloqueos(LecturaBloqueos lectura, String descripcion) {
        try {
            return lectura.leer();
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No se pudieron leer los bloqueos de " + descripcion, excepcion);
        }
    }

    @FunctionalInterface
    private interface LecturaBloqueos {
        List<Bloqueo> leer() throws IOException;
    }

    /** Clasifica los pedidos del mes segun su avance guardado (ver {@link #cargarDiaADia}). */
    private static final class SeleccionDiaADia {
        private final Instant ahora;
        private final Instant inicioOperacion;
        private final List<Pedido> operables = new ArrayList<>();
        private final Map<Integer, Integer> entregadas = new HashMap<>();
        private final List<AvancePedido> vencidos = new ArrayList<>();

        private SeleccionDiaADia(Instant ahora, Instant inicioOperacion) {
            this.ahora = ahora;
            this.inicioOperacion = inicioOperacion;
        }

        private void evaluar(PedidoFuente fuente, LineaTiempo lineaTiempo, ZoneId zona) {
            if (!fuente.registradoEn().isBefore(ahora)) {
                operables.add(aPedido(fuente, fuente.cantidad(), lineaTiempo, zona));
                return;
            }
            boolean cerrado = fuente.estado() == EstadoAvance.ENTREGADO || fuente.estado() == EstadoAvance.INCUMPLIDO;
            if (fuente.registradoEn().isBefore(inicioOperacion) || cerrado) {
                return;
            }
            int pendiente = fuente.cantidad() - fuente.cantidadEntregada();
            if (!fuente.horaLimite().isAfter(ahora)) {
                vencidos.add(new AvancePedido(fuente.id(), EstadoAvance.INCUMPLIDO, fuente.cantidadEntregada(),
                        null, null));
            } else if (pendiente > 0) {
                operables.add(aPedido(fuente, pendiente, lineaTiempo, zona));
                if (fuente.cantidadEntregada() > 0) {
                    entregadas.put(fuente.id(), fuente.cantidadEntregada());
                }
            }
        }
    }
}
