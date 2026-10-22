package pe.pucp.paqtracker.modulos.incidencias.presentacion;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.EstimacionAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.casouso.CasoUsoCancelarAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.casouso.CasoUsoEstimarAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.casouso.CasoUsoRegistrarAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto.RespuestaRegistroAveria;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.dto.SolicitudRegistroAveria;

import java.util.List;

/**
 * API REST de las incidencias de una ejecucion: CU-13 Registrar averia, con su estimacion previa y su
 * cancelacion mientras sigue programada.
 */
@RestController
@RequestMapping("/api/ejecuciones/{id}/averias")
public class ControladorIncidencias {

    private final CasoUsoRegistrarAveria casoUsoRegistrarAveria;
    private final CasoUsoCancelarAveria casoUsoCancelarAveria;
    private final CasoUsoEstimarAveria casoUsoEstimarAveria;

    /**
     * @param casoUsoRegistrarAveria CU-13
     * @param casoUsoCancelarAveria  deshacer una averia aun no aplicada
     * @param casoUsoEstimarAveria   estimacion previa por tipo
     */
    public ControladorIncidencias(CasoUsoRegistrarAveria casoUsoRegistrarAveria,
                                  CasoUsoCancelarAveria casoUsoCancelarAveria,
                                  CasoUsoEstimarAveria casoUsoEstimarAveria) {
        this.casoUsoRegistrarAveria = casoUsoRegistrarAveria;
        this.casoUsoCancelarAveria = casoUsoCancelarAveria;
        this.casoUsoEstimarAveria = casoUsoEstimarAveria;
    }

    /**
     * Cuando se aplicaria y cuando volveria a operar una unidad si ahora se registrara una averia de cada
     * tipo. No registra nada.
     *
     * @param id identificador de la ejecucion
     * @return una estimacion por tipo, de 1 a 3
     */
    @GetMapping("/estimacion")
    public List<EstimacionAveria> estimar(@PathVariable String id) {
        return casoUsoEstimarAveria.ejecutar(id);
    }

    /**
     * Deshace una averia registrada por error mientras el motor aun no la aplica. Responde 409 si ya se
     * aplico o ya estaba cancelada.
     *
     * @param id       identificador de la ejecucion
     * @param averiaId identificador del registro devuelto al registrarla
     */
    @DeleteMapping("/{averiaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelar(@PathVariable String id, @PathVariable long averiaId) {
        casoUsoCancelarAveria.ejecutar(id, averiaId);
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
