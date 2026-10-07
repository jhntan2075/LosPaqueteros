package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import org.springframework.stereotype.Component;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.lectura.CargadorBloqueos;
import pe.pucp.paqtracker.lectura.CargadorPedidos;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.util.RangoFechas;
import java.io.IOException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Lee los pedidos y bloqueos de una ejecucion desde las carpetas configuradas y los ubica en la
 * linea de tiempo de la ejecucion (minuto cero = inicio de su horizonte).
 */
@Component
public class CargadorDatosEscenario {

    private static final int MINUTOS_POR_DIA = 1440;
    private static final DateTimeFormatter FORMATO_MES = DateTimeFormatter.ofPattern("yyyyMM");

    private final PropiedadesDominio.Datos datos;
    private final ZoneId zona;

    /**
     * @param propiedades parametros de la operacion
     */
    public CargadorDatosEscenario(PropiedadesDominio propiedades) {
        this.datos = propiedades.datos();
        this.zona = ZoneId.of(propiedades.ejecucion().zonaHoraria());
    }

    /**
     * Datos de la operacion dia a dia: el mes en curso, con minuto cero en su primer dia. Solo se
     * conservan los pedidos que aun no llegan, porque los anteriores al arranque no se operaron.
     *
     * @param ahora fecha y hora real del arranque
     * @return datos del mes en curso; los pedidos pueden ser vacios si no hay archivo del mes
     */
    public DatosEscenario cargarDiaADia(ZonedDateTime ahora) {
        YearMonth mes = YearMonth.from(ahora);
        LineaTiempo lineaTiempo = new LineaTiempo(mes.atDay(1).atStartOfDay(zona));
        int minutoInicial = (int) Math.floor(lineaTiempo.aMinuto(ahora));
        int horizonte = mes.lengthOfMonth() * MINUTOS_POR_DIA;
        String clave = mes.format(FORMATO_MES);
        try {
            List<Pedido> pedidos = CargadorPedidos.cargar(datos.ventas(), horizonte, clave).stream()
                    .filter(pedido -> pedido.getInstanteRegistro() >= minutoInicial).toList();
            List<Bloqueo> bloqueos = CargadorBloqueos.cargar(datos.bloqueos(), clave);
            return new DatosEscenario(lineaTiempo, minutoInicial, horizonte, pedidos, bloqueos, 0);
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No se pudieron leer los datos del mes " + clave, excepcion);
        }
    }

    /**
     * Datos de una simulacion sobre un rango de dias, con minuto cero en el primer dia.
     *
     * @param fechaInicio primer dia
     * @param dias        cantidad de dias
     * @return datos del rango
     * @throws SolicitudInvalidaException si no hay datos legibles o el rango no tiene pedidos
     */
    public DatosEscenario cargarRango(LocalDate fechaInicio, int dias) {
        RangoFechas rango = RangoFechas.de(fechaInicio, fechaInicio.plusDays(dias - 1L));
        LineaTiempo lineaTiempo = new LineaTiempo(fechaInicio.atStartOfDay(zona));
        try {
            List<Pedido> pedidos = CargadorPedidos.cargarEnRango(datos.ventas(), rango);
            if (pedidos.isEmpty()) {
                throw new SolicitudInvalidaException("No hay pedidos entre " + rango.getInicio() + " y "
                        + rango.getFin() + "; cargue el archivo de ventas del periodo");
            }
            List<Bloqueo> bloqueos = CargadorBloqueos.cargarEnRango(datos.bloqueos(), rango);
            return new DatosEscenario(lineaTiempo, 0, rango.duracionMinutos(), pedidos, bloqueos, 0);
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No se pudieron leer los datos desde " + fechaInicio, excepcion);
        }
    }
}
