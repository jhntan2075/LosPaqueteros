package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.SolicitudCreacionEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador.MapeadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CreadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.MotorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidos;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.util.UUID;

/**
 * Implementa CU-17 Ejecutar la simulacion hasta el colapso: crea la ejecucion con reloj acelerado que
 * se detiene en el primer pedido que no se puede entregar a tiempo. Queda CONFIGURADA.
 */
@Service
public class CasoUsoEjecutarColapso {

    private static final int LONGITUD_ID = 8;

    private final CargadorDatosEscenario cargadorDatos;
    private final CreadorEjecucion creador;
    private final MapeadorEjecucion mapeador;
    private final PropiedadesDominio propiedades;
    private final PuertoPedidos pedidos;

    /**
     * @param cargadorDatos lector de los datos
     * @param creador       alta comun de ejecuciones
     * @param mapeador      conversion a DTO
     * @param propiedades   parametros de la operacion
     * @param pedidos       pedidos guardados, donde el lote subido queda atado a la corrida
     */
    public CasoUsoEjecutarColapso(CargadorDatosEscenario cargadorDatos, CreadorEjecucion creador,
                                  MapeadorEjecucion mapeador, PropiedadesDominio propiedades,
                                  PuertoPedidos pedidos) {
        this.cargadorDatos = cargadorDatos;
        this.creador = creador;
        this.mapeador = mapeador;
        this.propiedades = propiedades;
        this.pedidos = pedidos;
    }

    /**
     * @param solicitud fecha de inicio y algoritmo; los dias de datos son los configurados
     * @return ejecucion creada, en estado CONFIGURADA
     */
    public RespuestaEjecucion ejecutar(SolicitudCreacionEjecucion solicitud) {
        int dias = propiedades.ejecucion().diasColapso();
        AlgoritmoPlanificacion algoritmo = AlgoritmoPlanificacion.desde(solicitud.algoritmo() == null
                ? propiedades.planificador().algoritmo() : solicitud.algoritmo());
        String id = "colapso-" + UUID.randomUUID().toString().substring(0, LONGITUD_ID);
        MotorEjecucion motor = creador.crear(id, "Simulación hasta el colapso desde " + solicitud.descripcionInicio(),
                TipoEscenario.COLAPSO_LOGISTICO, algoritmo, solicitud.fechaInicio(),
                solicitud.horaInicioOMedianoche(), dias,
                propiedades.ejecucion().factorColapso(), cargadorDatos.cargarRango(solicitud.fechaInicio(),
                        solicitud.horaInicioOMedianoche(), dias, solicitud.lotePedidos()),
                solicitud.flotaOPorDefecto());
        if (solicitud.lotePedidos() != null) {
            pedidos.vincularLote(solicitud.lotePedidos(), id);
        }
        return mapeador.aRespuesta(motor);
    }
}
