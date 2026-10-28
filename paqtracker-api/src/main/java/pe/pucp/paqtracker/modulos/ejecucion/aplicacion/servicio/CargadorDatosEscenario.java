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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalTime;
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
     * Datos de una simulacion de {@code dias} dias completos que arranca a una hora del primer dia. El
     * minuto cero es la medianoche del primer dia y el reloj parte en la hora pedida; si no es la
     * medianoche, se lee un dia mas para cubrir el horizonte y se descartan los pedidos anteriores.
     *
     * @param fechaInicio primer dia
     * @param horaInicio  hora del primer dia en la que arranca el reloj
     * @param dias        cantidad de dias
     * @return datos del rango
     * @throws SolicitudInvalidaException si no hay datos legibles o el rango no tiene pedidos
     */
    public DatosEscenario cargarRango(LocalDate fechaInicio, LocalTime horaInicio, int dias) {
        int minutoInicial = horaInicio.toSecondOfDay() / 60;
        RangoFechas rango = rangoDe(fechaInicio, horaInicio, dias);
        LineaTiempo lineaTiempo = new LineaTiempo(fechaInicio.atStartOfDay(zona));
        int horizonte = minutoInicial + dias * MINUTOS_POR_DIA;
        try {
            List<Pedido> pedidos = CargadorPedidos.cargarEnRango(datos.ventas(), rango).stream()
                    .filter(pedido -> pedido.getInstanteRegistro() >= minutoInicial
                            && pedido.getInstanteRegistro() < horizonte).toList();
            if (pedidos.isEmpty()) {
                throw new SolicitudInvalidaException("No hay pedidos entre " + fechaInicio + " " + horaInicio
                        + " y " + rango.getFin() + "; cargue el archivo de ventas del periodo");
            }
            List<Bloqueo> bloqueos = CargadorBloqueos.cargarEnRango(datos.bloqueos(), rango);
            return new DatosEscenario(lineaTiempo, minutoInicial, horizonte, pedidos, bloqueos, 0);
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No se pudieron leer los datos desde " + fechaInicio, excepcion);
        }
    }

    /**
     * Comprueba que haya archivo de ventas para cada mes que toca el horizonte. Sin el, la simulacion
     * correria su tramo final sin pedidos, por ejemplo al arrancar a una hora tardia del ultimo dia del
     * mes, cuando el horizonte termina en el mes siguiente.
     *
     * @param fechaInicio primer dia
     * @param horaInicio  hora del primer dia en la que arranca el reloj
     * @param dias        cantidad de dias
     * @throws SolicitudInvalidaException si falta el archivo de ventas de algun mes del horizonte
     */
    public void exigirVentasDelRango(LocalDate fechaInicio, LocalTime horaInicio, int dias) {
        Path carpeta = Path.of(datos.ventas());
        if (!Files.isDirectory(carpeta)) {
            return;
        }
        RangoFechas rango = rangoDe(fechaInicio, horaInicio, dias);
        for (YearMonth mes = YearMonth.from(rango.getInicio()); !mes.isAfter(YearMonth.from(rango.getFin()));
             mes = mes.plusMonths(1)) {
            String archivo = "ventas." + mes.format(FORMATO_MES) + ".txt";
            if (!Files.isRegularFile(carpeta.resolve(archivo))) {
                throw new SolicitudInvalidaException("Falta el archivo de ventas " + archivo + ": la simulacion de "
                        + dias + " dias desde " + fechaInicio + " " + horaInicio + " llega hasta " + rango.getFin()
                        + "; cargue ese archivo o elija otra fecha u hora de inicio");
            }
        }
    }

    /** Dias que cubre el horizonte: uno mas si el reloj no arranca a la medianoche. */
    private static RangoFechas rangoDe(LocalDate fechaInicio, LocalTime horaInicio, int dias) {
        boolean medianoche = horaInicio.toSecondOfDay() < 60;
        return RangoFechas.de(fechaInicio, fechaInicio.plusDays(medianoche ? dias - 1L : dias));
    }
}
