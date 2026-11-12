package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.casouso;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.DatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto.RespuestaEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.mapeador.MapeadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CargadorDatosEscenario.CargaDiaADia;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ConfiguracionMotor;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.CreadorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.MotorEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.RegistroEjecuciones;
import pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio.ServicioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoPedidos;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.TipoEscenario;
import pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto.ComposicionFlota;
import pe.pucp.paqtracker.modulos.planificacion.dominio.AlgoritmoPlanificacion;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.Optional;

/**
 * Implementa CU-15 Ejecutar la operacion dia a dia: arranca, con reloj real (k = 1), la ejecucion sobre el mes
 * en curso. Hay una sola; si ya corre, la devuelve sin crear otra.
 *
 * <p>El estado vivo esta en memoria, pero los pedidos del mes y su avance estan en la base. Si la API se
 * reinicio, la operacion retoma: los pedidos pendientes con plazo vigente vuelven a planificarse por lo que les
 * falta, los que vencieron mientras estuvo detenida quedan incumplidos, y el resultado del mes sigue sumando
 * sobre lo guardado.
 */
@Service
public class CasoUsoEjecutarDiaADia {

    private static final Logger LOGGER = LoggerFactory.getLogger(CasoUsoEjecutarDiaADia.class);
    private static final double TIEMPO_REAL = 1.0;
    private static final String NOMBRE = "Operación día a día";

    private final CargadorDatosEscenario cargadorDatos;
    private final CreadorEjecucion creador;
    private final RegistroEjecuciones registro;
    private final MapeadorEjecucion mapeador;
    private final PropiedadesDominio propiedades;
    private final PuertoPedidos pedidos;
    private final RepositorioEjecucion repositorioEjecucion;
    private final Clock relojPared;

    /**
     * @param cargadorDatos        lector de los datos del mes
     * @param creador              alta comun de ejecuciones
     * @param registro             motores en memoria
     * @param mapeador             conversion a DTO
     * @param propiedades          parametros de la operacion
     * @param pedidos              pedidos guardados, donde se marcan los vencidos
     * @param repositorioEjecucion ejecuciones guardadas, con el resultado del mes
     * @param relojPared           reloj real
     */
    public CasoUsoEjecutarDiaADia(CargadorDatosEscenario cargadorDatos, CreadorEjecucion creador,
                                  RegistroEjecuciones registro, MapeadorEjecucion mapeador,
                                  PropiedadesDominio propiedades, PuertoPedidos pedidos,
                                  RepositorioEjecucion repositorioEjecucion, Clock relojPared) {
        this.cargadorDatos = cargadorDatos;
        this.creador = creador;
        this.registro = registro;
        this.mapeador = mapeador;
        this.propiedades = propiedades;
        this.pedidos = pedidos;
        this.repositorioEjecucion = repositorioEjecucion;
        this.relojPared = relojPared;
    }

    /**
     * @return la ejecucion dia a dia en curso
     */
    public RespuestaEjecucion ejecutar() {
        Optional<MotorEjecucion> existente = registro.buscar(ServicioEjecucion.ID_DIA_A_DIA)
                .filter(motor -> !motor.getEstado().esTerminal());
        if (existente.isPresent()) {
            return mapeador.aRespuesta(existente.get());
        }
        ZonedDateTime ahora = ZonedDateTime.now(relojPared);
        LocalDate primerDia = ahora.toLocalDate().withDayOfMonth(1);
        Optional<RegistroEjecucion> mesGuardado = repositorioEjecucion.buscar(
                ConfiguracionMotor.idRegistroDiaADia(ServicioEjecucion.ID_DIA_A_DIA, primerDia));
        Instant inicioOperacion = mesGuardado.map(RegistroEjecucion::creadaEn).orElse(ahora.toInstant());
        CargaDiaADia carga = cargadorDatos.cargarDiaADia(ahora, inicioOperacion);
        pedidos.registrarAvance(carga.vencidos());
        if (!carga.vencidos().isEmpty()) {
            LOGGER.info("{} pedidos vencieron con la API detenida y quedan incumplidos", carga.vencidos().size());
        }
        ResultadoEjecucion previo = mesGuardado.map(RegistroEjecucion::resultado).orElse(ResultadoEjecucion.VACIO)
                .conIncumplimientos(carga.vencidos().size());
        DatosEscenario datos = carga.datos().conResultadoPrevio(previo);
        MotorEjecucion motor = creador.crear(ServicioEjecucion.ID_DIA_A_DIA, NOMBRE, TipoEscenario.DIA_A_DIA,
                AlgoritmoPlanificacion.desde(propiedades.planificador().algoritmo()), primerDia, LocalTime.MIDNIGHT,
                ahora.toLocalDate().lengthOfMonth(), TIEMPO_REAL, datos, ComposicionFlota.porDefecto());
        motor.iniciar();
        return mapeador.aRespuesta(motor);
    }

    /**
     * Reinicia la operacion dia a dia para que tome los parametros del dominio vigentes (B02, B04, B07-B09):
     * detiene la ejecucion en curso y crea otra desde el instante actual. Los pedidos pendientes se retoman como
     * tras un reinicio de la API y se replanifican.
     *
     * @return la ejecucion dia a dia nueva
     */
    public RespuestaEjecucion reiniciar() {
        registro.buscar(ServicioEjecucion.ID_DIA_A_DIA).filter(motor -> !motor.getEstado().esTerminal())
                .ifPresent(MotorEjecucion::detener);
        LOGGER.info("Operación día a día reiniciada para aplicar los parámetros del dominio vigentes");
        return ejecutar();
    }
}
