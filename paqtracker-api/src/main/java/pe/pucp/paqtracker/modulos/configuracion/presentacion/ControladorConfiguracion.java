package pe.pucp.paqtracker.modulos.configuracion.presentacion;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.ParametrosDominioApi;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RangosSemaforoApi;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RespuestaConfiguracionDominio;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio.ServicioConfiguracion;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio.ServicioParametrosDominio;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio.ServicioRangosSemaforo;

/**
 * API REST de la configuracion de la operacion.
 */
@RestController
@RequestMapping("/api/configuracion")
public class ControladorConfiguracion {

    private final ServicioConfiguracion servicioConfiguracion;
    private final ServicioRangosSemaforo servicioRangosSemaforo;
    private final ServicioParametrosDominio servicioParametros;

    /**
     * @param servicioConfiguracion  consulta de la configuracion del dominio
     * @param servicioRangosSemaforo rangos del semaforo configurables
     * @param servicioParametros     parametros del dominio configurables
     */
    public ControladorConfiguracion(ServicioConfiguracion servicioConfiguracion,
                                    ServicioRangosSemaforo servicioRangosSemaforo,
                                    ServicioParametrosDominio servicioParametros) {
        this.servicioConfiguracion = servicioConfiguracion;
        this.servicioRangosSemaforo = servicioRangosSemaforo;
        this.servicioParametros = servicioParametros;
    }

    /**
     * @return almacenes, unidades y duraciones de averia vigentes (B02, B04, B07-B09)
     */
    @GetMapping("/parametros")
    public ParametrosDominioApi parametros() {
        return ParametrosDominioApi.desde(servicioParametros.vigentes());
    }

    /**
     * Cambia los parametros del dominio. Rigen para las ejecuciones que se crean despues; las que estan en
     * curso conservan los suyos. Responde 400 si un valor esta fuera de rango o es incoherente.
     *
     * @param solicitud parametros nuevos
     * @return parametros guardados
     */
    @PutMapping("/parametros")
    public ParametrosDominioApi actualizarParametros(@Valid @RequestBody ParametrosDominioApi solicitud) {
        return ParametrosDominioApi.desde(servicioParametros.actualizar(solicitud.aDominio()));
    }

    /**
     * Restablece los valores por defecto de los parametros del dominio.
     *
     * @return parametros por defecto
     */
    @DeleteMapping("/parametros")
    public ParametrosDominioApi restablecerParametros() {
        return ParametrosDominioApi.desde(servicioParametros.restablecer());
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
