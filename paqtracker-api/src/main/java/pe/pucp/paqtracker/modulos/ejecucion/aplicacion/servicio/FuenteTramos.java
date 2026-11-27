package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.comun.tiempo.LineaTiempo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario.TramoDatos;
import java.time.LocalDate;

/**
 * De donde sale cada tramo adicional de datos de una ejecucion sin horizonte fijo (simulacion hasta el
 * colapso): el caso de uso la arma con el origen de sus pedidos (sistema o lote subido).
 */
@FunctionalInterface
public interface FuenteTramos {

    /**
     * @param lineaTiempo    linea de tiempo de la ejecucion
     * @param desdeMinuto    inicio del tramo (inclusive)
     * @param hastaMinuto    fin del tramo (exclusive)
     * @param primerDiaNuevo primer dia que el tramo anterior no cubria
     * @param ultimoDiaNuevo ultimo dia que cubre el tramo
     * @return pedidos y bloqueos del tramo
     */
    TramoDatos cargar(LineaTiempo lineaTiempo, int desdeMinuto, int hastaMinuto, LocalDate primerDiaNuevo,
                      LocalDate ultimoDiaNuevo);
}
