package pe.pucp.paqtracker.modulos.ejecucion.presentacion;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.MensajeEstadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoControlarEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoEjecutarColapso;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso.CasoUsoEjecutarSimulacionPeriodo;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudCreacionEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import java.util.List;

/**
 * API REST de las ejecuciones. El estado en vivo no se consulta por aqui de forma periodica: se
 * difunde por STOMP; {@code GET /estado} solo sirve para quien se conecta tarde.
 */
@RestController
@RequestMapping("/api/ejecuciones")
public class ControladorEjecuciones {

    private final CasoUsoEjecutarSimulacionPeriodo casoUsoPeriodo;
    private final CasoUsoEjecutarColapso casoUsoColapso;
    private final CasoUsoControlarEjecucion casoUsoControlar;
    private final ServicioEjecucion servicioEjecucion;

    /**
     * @param casoUsoPeriodo   CU-16
     * @param casoUsoColapso   CU-17
     * @param casoUsoControlar control del reloj
     * @param servicioEjecucion consultas
     */
    public ControladorEjecuciones(CasoUsoEjecutarSimulacionPeriodo casoUsoPeriodo,
                                  CasoUsoEjecutarColapso casoUsoColapso,
                                  CasoUsoControlarEjecucion casoUsoControlar, ServicioEjecucion servicioEjecucion) {
        this.casoUsoPeriodo = casoUsoPeriodo;
        this.casoUsoColapso = casoUsoColapso;
        this.casoUsoControlar = casoUsoControlar;
        this.servicioEjecucion = servicioEjecucion;
    }

    /**
     * @return todas las ejecuciones de esta instancia
     */
    @GetMapping
    public List<RespuestaEjecucion> listar() {
        return servicioEjecucion.listar();
    }

    /**
     * Crea una simulacion de periodo o hasta el colapso. La operacion dia a dia no se crea: arranca
     * sola con la API.
     *
     * @param solicitud escenario, fecha de inicio, dias y algoritmo
     * @return ejecucion creada, en estado CONFIGURADA
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaEjecucion crear(@Valid @RequestBody SolicitudCreacionEjecucion solicitud) {
        TipoEscenario tipo = interpretarTipo(solicitud.tipoEscenario());
        return switch (tipo) {
            case SIMULACION_PERIODO -> casoUsoPeriodo.ejecutar(solicitud);
            case COLAPSO_LOGISTICO -> casoUsoColapso.ejecutar(solicitud);
            case DIA_A_DIA -> throw new SolicitudInvalidaException(
                    "La operacion dia a dia ya esta en curso con id " + ServicioEjecucion.ID_DIA_A_DIA);
        };
    }

    /**
     * @param id identificador de la ejecucion
     * @return resumen de la ejecucion
     */
    @GetMapping("/{id}")
    public RespuestaEjecucion consultar(@PathVariable String id) {
        return servicioEjecucion.consultar(id);
    }

    /**
     * @param id identificador de la ejecucion
     * @return ultima instantanea difundida
     */
    @GetMapping("/{id}/estado")
    public MensajeEstadoEjecucion estado(@PathVariable String id) {
        return servicioEjecucion.instantanea(id);
    }

    /**
     * @param id identificador de la ejecucion
     * @return ejecucion en curso
     */
    @PostMapping("/{id}/iniciar")
    public RespuestaEjecucion iniciar(@PathVariable String id) {
        return casoUsoControlar.ejecutar(id, CasoUsoControlarEjecucion.Accion.INICIAR);
    }

    /**
     * @param id identificador de la ejecucion
     * @return ejecucion pausada
     */
    @PostMapping("/{id}/pausar")
    public RespuestaEjecucion pausar(@PathVariable String id) {
        return casoUsoControlar.ejecutar(id, CasoUsoControlarEjecucion.Accion.PAUSAR);
    }

    /**
     * @param id identificador de la ejecucion
     * @return ejecucion finalizada
     */
    @PostMapping("/{id}/detener")
    public RespuestaEjecucion detener(@PathVariable String id) {
        return casoUsoControlar.ejecutar(id, CasoUsoControlarEjecucion.Accion.DETENER);
    }

    private static TipoEscenario interpretarTipo(String tipo) {
        try {
            return TipoEscenario.valueOf(tipo);
        } catch (IllegalArgumentException excepcion) {
            throw new SolicitudInvalidaException("Tipo de escenario desconocido: " + tipo
                    + " (use SIMULACION_PERIODO o COLAPSO_LOGISTICO)", excepcion);
        }
    }
}
