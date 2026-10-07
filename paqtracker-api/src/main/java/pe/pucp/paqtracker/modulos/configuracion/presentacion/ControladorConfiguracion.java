package pe.pucp.paqtracker.modulos.configuracion.presentacion;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RespuestaConfiguracionDominio;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio.ServicioConfiguracion;

/**
 * API REST de la configuracion de la operacion.
 */
@RestController
@RequestMapping("/api/configuracion")
public class ControladorConfiguracion {

    private final ServicioConfiguracion servicioConfiguracion;

    /**
     * @param servicioConfiguracion consulta de la configuracion del dominio
     */
    public ControladorConfiguracion(ServicioConfiguracion servicioConfiguracion) {
        this.servicioConfiguracion = servicioConfiguracion;
    }

    /**
     * @return parametros del dominio vigentes
     */
    @GetMapping("/dominio")
    public RespuestaConfiguracionDominio dominio() {
        return servicioConfiguracion.consultar();
    }
}
