package pe.pucp.paqtracker.modulos.configuracion.aplicacion.servicio;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.modelo.Almacen;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;
import pe.pucp.paqtracker.modelo.ParametrosDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto.RespuestaConfiguracionDominio;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteParametrosDominio;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AlmacenEnMapa;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.Coordenada;
import pe.pucp.paqtracker.modulos.difusion.aplicacion.servicio.NomenclaturaOperacion;
import java.util.List;

/**
 * Expone la configuracion del dominio: las constantes de {@link ConfiguracionDominio} del nucleo y los
 * parametros vigentes que configura el operador (almacenes y unidades).
 */
@Service
public class ServicioConfiguracion {

    private static final int MINUTOS_POR_HORA = 60;

    private final FuenteParametrosDominio parametros;

    /**
     * @param parametros parametros del dominio vigentes
     */
    public ServicioConfiguracion(FuenteParametrosDominio parametros) {
        this.parametros = parametros;
    }

    /**
     * @return parametros del dominio vigentes
     */
    public RespuestaConfiguracionDominio consultar() {
        ParametrosDominio vigentes = parametros.vigentes();
        List<AlmacenEnMapa> almacenes = ConfiguracionDominio.crearAlmacenes(vigentes).stream()
                .map(ServicioConfiguracion::aAlmacen).toList();
        List<RespuestaConfiguracionDominio.TipoUnidad> tipos = List.of(
                tipo(TipoVehiculo.AUTO, vigentes, ConfiguracionDominio.CANTIDAD_AUTOS),
                tipo(TipoVehiculo.MOTOCICLETA, vigentes, ConfiguracionDominio.CANTIDAD_MOTOS),
                tipo(TipoVehiculo.BICICLETA, vigentes, ConfiguracionDominio.CANTIDAD_BICICLETAS));
        return new RespuestaConfiguracionDominio(ConfiguracionDominio.MALLA_ANCHO, ConfiguracionDominio.MALLA_ALTO,
                ConfiguracionDominio.TIEMPO_SERVICIO_MINUTOS,
                ConfiguracionDominio.PLAZO_MAXIMO_MINUTOS / MINUTOS_POR_HORA, ConfiguracionDominio.iniciosTurno(),
                almacenes, tipos);
    }

    private static RespuestaConfiguracionDominio.TipoUnidad tipo(TipoVehiculo tipo, ParametrosDominio vigentes,
                                                                 int cantidad) {
        ParametrosDominio.ParametrosUnidad unidad = vigentes.unidad(tipo);
        return new RespuestaConfiguracionDominio.TipoUnidad(NomenclaturaOperacion.tipoUnidad(tipo),
                unidad.capacidad(), unidad.velocidadKmH(), unidad.costoPorKm(), cantidad);
    }

    private static AlmacenEnMapa aAlmacen(Almacen almacen) {
        return new AlmacenEnMapa(almacen.getId(), NomenclaturaOperacion.codigoAlmacen(almacen),
                NomenclaturaOperacion.nombreAlmacen(almacen),
                new Coordenada(almacen.getUbicacion().getX(), almacen.getUbicacion().getY()),
                almacen.esIlimitado() ? null : almacen.getCapacidadMaxima(),
                almacen.esIlimitado() ? null : almacen.getStockDisponible(), almacen.esIlimitado(), null);
    }
}
