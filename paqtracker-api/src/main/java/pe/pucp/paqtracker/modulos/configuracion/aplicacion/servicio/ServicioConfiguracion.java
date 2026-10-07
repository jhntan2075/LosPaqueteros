package pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RespuestaConfiguracionDominio;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AlmacenEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import java.util.List;

/**
 * Expone la configuracion del dominio (fuente unica: {@link ConfiguracionDominio} del nucleo). La
 * edicion de parametros (CU-26 a CU-28) queda para una siguiente entrega.
 */
@Service
public class ServicioConfiguracion {

    private static final int MINUTOS_POR_HORA = 60;

    /**
     * @return parametros del dominio vigentes
     */
    public RespuestaConfiguracionDominio consultar() {
        List<AlmacenEnMapa> almacenes = ConfiguracionDominio.crearAlmacenes().stream()
                .map(ServicioConfiguracion::aAlmacen).toList();
        List<RespuestaConfiguracionDominio.TipoUnidad> tipos = List.of(
                tipo(TipoVehiculo.AUTO, ConfiguracionDominio.CANTIDAD_AUTOS),
                tipo(TipoVehiculo.MOTOCICLETA, ConfiguracionDominio.CANTIDAD_MOTOS),
                tipo(TipoVehiculo.BICICLETA, ConfiguracionDominio.CANTIDAD_BICICLETAS));
        return new RespuestaConfiguracionDominio(ConfiguracionDominio.MALLA_ANCHO, ConfiguracionDominio.MALLA_ALTO,
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS / MINUTOS_POR_HORA, ConfiguracionDominio.iniciosTurno(),
                almacenes, tipos);
    }

    private static RespuestaConfiguracionDominio.TipoUnidad tipo(TipoVehiculo tipo, int cantidad) {
        return new RespuestaConfiguracionDominio.TipoUnidad(NomenclaturaOperacion.tipoUnidad(tipo),
                tipo.getCapacidad(), tipo.getVelocidad(), tipo.getCostoPorKm(), cantidad);
    }

    private static AlmacenEnMapa aAlmacen(Almacen almacen) {
        return new AlmacenEnMapa(almacen.getId(), NomenclaturaOperacion.codigoAlmacen(almacen),
                NomenclaturaOperacion.nombreAlmacen(almacen),
                new Coordenada(almacen.getUbicacion().getX(), almacen.getUbicacion().getY()),
                almacen.esIlimitado() ? null : almacen.getCapacidadMaxima(),
                almacen.esIlimitado() ? null : almacen.getStockDisponible(), almacen.esIlimitado());
    }
}
