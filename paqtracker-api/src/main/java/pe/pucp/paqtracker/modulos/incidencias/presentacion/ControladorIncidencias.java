package pe.pucp.paqtracker.modulos.incidencias.presentacion;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.casouso.CasoUsoRegistrarAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto.RespuestaRegistroAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto.SolicitudRegistroAveria;

/**
 * API REST de las incidencias de una ejecucion: CU-13 Registrar averia.
 */
@RestController
@RequestMapping("/api/ejecuciones/{id}/averias")
public class ControladorIncidencias {

    private final CasoUsoRegistrarAveria casoUsoRegistrarAveria;

    /**
     * @param casoUsoRegistrarAveria CU-13
     */
    public ControladorIncidencias(CasoUsoRegistrarAveria casoUsoRegistrarAveria) {
        this.casoUsoRegistrarAveria = casoUsoRegistrarAveria;
    }

    /**
     * Registra una averia en el instante actual del reloj de la ejecucion. Responde 202: la averia queda
     * encolada y el motor la aplica en su siguiente salto Sc, que lo difunde con {@code UNIDAD_AVERIADA}.
     *
     * @param id        identificador de la ejecucion
     * @param solicitud unidad y tipo de la averia
     * @return averia registrada y encolada
     */
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RespuestaRegistroAveria registrar(@PathVariable String id,
                                             @Valid @RequestBody SolicitudRegistroAveria solicitud) {
        return casoUsoRegistrarAveria.ejecutar(id, solicitud);
    }
}
