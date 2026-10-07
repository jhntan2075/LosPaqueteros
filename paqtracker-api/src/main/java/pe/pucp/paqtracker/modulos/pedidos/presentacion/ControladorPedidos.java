package pe.pucp.paqtracker.modulos.pedidos.presentacion;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoConsultarDetallePedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoConsultarPedidos;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoImportarBloqueos;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoImportarPedidos;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso.CasoUsoRegistrarPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaDetallePedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaImportacion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaRegistroPedido;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.SolicitudRegistroPedido;
import java.io.IOException;
import java.util.List;

/**
 * API REST del registro de pedidos: CU-01, CU-02 y CU-04.
 */
@RestController
@RequestMapping("/api")
public class ControladorPedidos {

    private final CasoUsoRegistrarPedido casoUsoRegistrar;
    private final CasoUsoImportarPedidos casoUsoImportar;
    private final CasoUsoImportarBloqueos casoUsoImportarBloqueos;
    private final CasoUsoConsultarPedidos casoUsoConsultar;
    private final CasoUsoConsultarDetallePedido casoUsoDetalle;

    /**
     * @param casoUsoRegistrar        CU-01
     * @param casoUsoImportar         CU-02
     * @param casoUsoImportarBloqueos carga de bloqueos
     * @param casoUsoConsultar        CU-04
     * @param casoUsoDetalle          CU-04, detalle con trazabilidad
     */
    public ControladorPedidos(CasoUsoRegistrarPedido casoUsoRegistrar, CasoUsoImportarPedidos casoUsoImportar,
                              CasoUsoImportarBloqueos casoUsoImportarBloqueos,
                              CasoUsoConsultarPedidos casoUsoConsultar, CasoUsoConsultarDetallePedido casoUsoDetalle) {
        this.casoUsoRegistrar = casoUsoRegistrar;
        this.casoUsoImportar = casoUsoImportar;
        this.casoUsoImportarBloqueos = casoUsoImportarBloqueos;
        this.casoUsoConsultar = casoUsoConsultar;
        this.casoUsoDetalle = casoUsoDetalle;
    }

    /**
     * @param solicitud datos del pedido
     * @return pedido registrado en la operacion dia a dia, con el efecto de la replanificacion
     */
    @PostMapping("/pedidos")
    @ResponseStatus(HttpStatus.CREATED)
    public RespuestaRegistroPedido registrar(@Valid @RequestBody SolicitudRegistroPedido solicitud) {
        return casoUsoRegistrar.ejecutar(solicitud);
    }

    /**
     * @param ejecucionId ejecucion a consultar; por defecto la operacion dia a dia
     * @return pedidos con su estado
     */
    @GetMapping("/pedidos")
    public List<RespuestaPedido> consultar(
            @RequestParam(defaultValue = ServicioEjecucion.ID_DIA_A_DIA) String ejecucionId) {
        return casoUsoConsultar.ejecutar(ejecucionId);
    }

    /**
     * @param codigo      codigo del pedido, p. ej. P-00042
     * @param ejecucionId ejecucion a consultar; por defecto la operacion dia a dia
     * @return pedido con su trazabilidad
     */
    @GetMapping("/pedidos/{codigo}")
    public RespuestaDetallePedido detalle(@PathVariable String codigo,
            @RequestParam(defaultValue = ServicioEjecucion.ID_DIA_A_DIA) String ejecucionId) {
        return casoUsoDetalle.ejecutar(ejecucionId, codigo);
    }

    /**
     * @param archivo archivo ventas.YYYYMM.txt
     * @param mes     mes del archivo, YYYYMM
     * @return registros validos y errores por linea
     */
    @PostMapping("/archivos/pedidos")
    public RespuestaImportacion importar(@RequestParam("file") MultipartFile archivo,
                                         @RequestParam("mes") String mes) {
        return casoUsoImportar.ejecutar(mes, leer(archivo));
    }

    /**
     * @param archivo archivo bloqueo.YYMM.txt
     * @param mes     mes del archivo, YYYYMM
     * @return bloqueos validos y errores por linea
     */
    @PostMapping("/archivos/bloqueos")
    public RespuestaImportacion importarBloqueos(@RequestParam("file") MultipartFile archivo,
                                                 @RequestParam("mes") String mes) {
        return casoUsoImportarBloqueos.ejecutar(mes, leer(archivo));
    }

    private static byte[] leer(MultipartFile archivo) {
        try {
            return archivo.getBytes();
        } catch (IOException excepcion) {
            throw new SolicitudInvalidaException("No se pudo leer el archivo subido", excepcion);
        }
    }
}
