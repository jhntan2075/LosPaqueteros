package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
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
 * Implementa CU-16 Ejecutar la simulacion de un periodo: crea la ejecucion sobre los dias pedidos con
 * reloj acelerado. Queda CONFIGURADA; el reloj arranca con la accion iniciar.
 */
@Service
public class CasoUsoEjecutarSimulacionPeriodo {

    private static final int DIAS_POR_DEFECTO = 5;
    private static final int LONGITUD_ID = 8;

    private final CargadorDatosEscenario cargadorDatos;
    private final CreadorEjecucion creador;
    private final MapeadorEjecucion mapeador;
    private final PropiedadesDominio propiedades;
    private final PuertoPedidos pedidos;

    /**
     * @param cargadorDatos lector de los datos del periodo
     * @param creador       alta comun de ejecuciones
     * @param mapeador      conversion a DTO
     * @param propiedades   parametros de la operacion
     * @param pedidos       pedidos guardados, donde el lote subido queda atado a la corrida
     */
    public CasoUsoEjecutarSimulacionPeriodo(CargadorDatosEscenario cargadorDatos, CreadorEjecucion creador,
                                            MapeadorEjecucion mapeador, PropiedadesDominio propiedades,
                                            PuertoPedidos pedidos) {
        this.cargadorDatos = cargadorDatos;
        this.creador = creador;
        this.mapeador = mapeador;
        this.propiedades = propiedades;
        this.pedidos = pedidos;
    }

    /**
     * @param solicitud fecha de inicio, dias y algoritmo
     * @return ejecucion creada, en estado CONFIGURADA
     * @throws SolicitudInvalidaException si los dias exceden el maximo o no hay datos en el periodo
     */
    public RespuestaEjecucion ejecutar(SolicitudCreacionEjecucion solicitud) {
        int dias = solicitud.dias() == null ? DIAS_POR_DEFECTO : solicitud.dias();
        int maximo = propiedades.ejecucion().diasPeriodoMax();
        if (dias > maximo) {
            throw new SolicitudInvalidaException("El periodo admite hasta " + maximo + " días: " + dias);
        }
        cargadorDatos.exigirVentasDelRango(solicitud.fechaInicio(), solicitud.horaInicioOMedianoche(), dias,
                solicitud.lotePedidos());
        AlgoritmoPlanificacion algoritmo = AlgoritmoPlanificacion.desde(solicitud.algoritmo() == null
                ? propiedades.planificador().algoritmo() : solicitud.algoritmo());
        String id = "periodo-" + UUID.randomUUID().toString().substring(0, LONGITUD_ID);
        MotorEjecucion motor = creador.crear(id, "Simulación de " + dias + " días desde " + solicitud.descripcionInicio(),
                TipoEscenario.SIMULACION_PERIODO, algoritmo, solicitud.fechaInicio(),
                solicitud.horaInicioOMedianoche(), dias,
                propiedades.ejecucion().factorPeriodo(), cargadorDatos.cargarRango(solicitud.fechaInicio(),
                        solicitud.horaInicioOMedianoche(), dias, solicitud.lotePedidos()),
                solicitud.flotaOPorDefecto());
        if (solicitud.lotePedidos() != null) {
            pedidos.vincularLote(solicitud.lotePedidos(), id);
        }
        return mapeador.aRespuesta(motor);
    }
}
