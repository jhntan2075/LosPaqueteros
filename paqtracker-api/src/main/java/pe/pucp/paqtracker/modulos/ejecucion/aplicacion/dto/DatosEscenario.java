package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modelo.Bloqueo;
import pe.pucp.paqtracker.modelo.Pedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import java.util.List;
import java.util.Map;

/**
 * Datos de entrada de una ejecucion, ya ubicados en su linea de tiempo.
 *
 * @param lineaTiempo        relacion entre minutos simulados y fechas
 * @param minutoInicial      minuto en el que arranca el reloj
 * @param horizonte          minuto en el que termina la ejecucion
 * @param pedidos            pedidos a operar; su id es su id en la base
 * @param bloqueos           bloqueos de la ejecucion
 * @param origenDatos        SISTEMA o ARCHIVO (lote subido para la corrida)
 * @param entregadasPrevias  dia a dia: paquetes de cada pedido entregados antes de un reinicio (el pedido entra
 *                           solo con lo que falta)
 * @param resultadoPrevio    dia a dia: lo operado en el mes antes de un reinicio; VACIO en los demas casos
 */
public record DatosEscenario(LineaTiempo lineaTiempo, int minutoInicial, int horizonte, List<Pedido> pedidos,
                             List<Bloqueo> bloqueos, String origenDatos, Map<Integer, Integer> entregadasPrevias,
                             ResultadoEjecucion resultadoPrevio) {

    /** Pedidos de los archivos del sistema. */
    public static final String ORIGEN_SISTEMA = "SISTEMA";

    /** Pedidos de un archivo subido para la corrida (y del sistema en los meses que no trae). */
    public static final String ORIGEN_ARCHIVO = "ARCHIVO";

    /**
     * @param lineaTiempo   relacion entre minutos simulados y fechas
     * @param minutoInicial minuto en el que arranca el reloj
     * @param horizonte     minuto en el que termina la ejecucion
     * @param pedidos       pedidos a operar
     * @param bloqueos      bloqueos de la ejecucion
     * @param origenDatos   SISTEMA o ARCHIVO
     * @return datos sin nada operado antes
     */
    public static DatosEscenario nuevos(LineaTiempo lineaTiempo, int minutoInicial, int horizonte,
                                        List<Pedido> pedidos, List<Bloqueo> bloqueos, String origenDatos) {
        return new DatosEscenario(lineaTiempo, minutoInicial, horizonte, pedidos, bloqueos, origenDatos, Map.of(),
                ResultadoEjecucion.VACIO);
    }

    /**
     * @param previo lo operado antes de un reinicio del dia a dia
     * @return los mismos datos con ese resultado previo
     */
    public DatosEscenario conResultadoPrevio(ResultadoEjecucion previo) {
        return new DatosEscenario(lineaTiempo, minutoInicial, horizonte, pedidos, bloqueos, origenDatos,
                entregadasPrevias, previo);
    }
}
