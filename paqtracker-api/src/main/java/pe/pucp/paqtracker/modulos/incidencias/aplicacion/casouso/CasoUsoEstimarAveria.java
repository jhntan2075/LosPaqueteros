package pe.pucp.paqtracker.modulos.incidencias.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.excepcion.RecursoNoEncontradoException;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.EstimacionAveria;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;

import java.util.List;

/**
 * Estima, sin registrar nada, cuando volveria a operar una unidad si ahora se registrara una averia de cada
 * tipo. El front lo muestra en el registro (CU-13) para que el operador elija el tipo sabiendo la hora.
 */
@Service
public class CasoUsoEstimarAveria {

    private final ServicioEjecucion servicioEjecucion;

    /**
     * @param servicioEjecucion fachada de ejecucion
     */
    public CasoUsoEstimarAveria(ServicioEjecucion servicioEjecucion) {
        this.servicioEjecucion = servicioEjecucion;
    }

    /**
     * @param ejecucionId ejecucion
     * @return una estimacion por tipo, de 1 a 3
     * @throws RecursoNoEncontradoException si la ejecucion no existe
     */
    public List<EstimacionAveria> ejecutar(String ejecucionId) {
        return servicioEjecucion.estimarAverias(ejecucionId);
    }
}
