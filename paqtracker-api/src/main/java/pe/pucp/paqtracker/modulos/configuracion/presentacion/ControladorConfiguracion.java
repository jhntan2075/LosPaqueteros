package pe.pucp.paqtracker.modulos.configuracion.presentacion;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RangosSemaforoApi;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RespuestaConfiguracionDominio;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio.ServicioConfiguracion;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio.ServicioRangosSemaforo;

/**
 * API REST de la configuracion de la operacion.
 */
@RestController
@RequestMapping("/api/configuracion")
public class ControladorConfiguracion {

    private final ServicioConfiguracion servicioConfiguracion;
    private final ServicioRangosSemaforo servicioRangosSemaforo;

    /**
     * @param servicioConfiguracion  consulta de la configuracion del dominio
     * @param servicioRangosSemaforo rangos del semaforo configurables
     */
    public ControladorConfiguracion(ServicioConfiguracion servicioConfiguracion,
                                    ServicioRangosSemaforo servicioRangosSemaforo) {
        this.servicioConfiguracion = servicioConfiguracion;
        this.servicioRangosSemaforo = servicioRangosSemaforo;
    }

    /**
     * @return parametros del dominio vigentes
     */
    @GetMapping("/dominio")
    public RespuestaConfiguracionDominio dominio() {
        return servicioConfiguracion.consultar();
    }

    /**
     * @return rangos del semaforo vigentes
     */
    @GetMapping("/semaforo")
    public RangosSemaforoApi semaforo() {
        return RangosSemaforoApi.desde(servicioRangosSemaforo.vigentes());
    }

    /**
     * Cambia los rangos del semaforo. Rigen desde la siguiente difusion de cada ejecucion, sin reiniciar.
     * Responde 400 si falta un umbral, alguno esta fuera de [0, 1] o no respeta el orden.
     *
     * @param solicitud rangos nuevos
     * @return rangos guardados
     */
    @PutMapping("/semaforo")
    public RangosSemaforoApi actualizarSemaforo(@Valid @RequestBody RangosSemaforoApi solicitud) {
        return RangosSemaforoApi.desde(servicioRangosSemaforo.actualizar(solicitud.aDominio()));
    }
}
