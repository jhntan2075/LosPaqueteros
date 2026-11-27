package pe.pucp.paqtracker.modulos.incidencias;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoMantenimiento;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.PuertoMantenimiento.MantenimientoFuente;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.servicio.CargaMantenimientoSistema;
import pe.pucp.paqtracker.modulos.incidencias.aplicacion.servicio.CargaMantenimientoSistema.Sincronizacion;
import pe.pucp.paqtracker.modulos.incidencias.dominio.MantenimientoRegistrado;
import pe.pucp.paqtracker.modulos.incidencias.dominio.RepositorioMantenimiento;
import pe.pucp.paqtracker.soporte.PropiedadesPrueba;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * El plan de mantenimiento preventivo se guarda en la base al arrancar, la base se iguala al archivo cuando
 * este cambia y un archivo con lineas invalidas no la toca. Restaura el plan del fixture al terminar, porque
 * la base H2 se comparte entre clases de prueba.
 */
@SpringBootTest
class IntegracionMantenimientoTest {

    private static final LocalDate DIA_AUTO = LocalDate.of(2026, 1, 15);

    @Autowired
    private RepositorioMantenimiento repositorio;

    @Autowired
    private CargaMantenimientoSistema cargaDelSistema;

    @Autowired
    private PuertoMantenimiento puerto;

    @TempDir
    private Path carpeta;

    @Test
    void alArrancar_elPlanDelArchivoQuedaEnLaBase_yUnaSegundaCargaNoDuplica() {
        assertEquals(List.of("2026-01-15:TA01", "2026-01-16:TM01", "2026-01-17:TB01"),
                repositorio.listarTodos().stream().map(MantenimientoRegistrado::clave).toList());

        Sincronizacion otraVez = cargaDelSistema.sincronizar();

        assertEquals(new Sincronizacion(3, 0, 0, List.of()), otraVez);
        assertEquals(3, repositorio.listarTodos().size());
    }

    @Test
    void puerto_devuelveLosMantenimientosDeLosDiasPedidosConTipoYNumero() {
        assertEquals(List.of(new MantenimientoFuente(DIA_AUTO, TipoVehiculo.AUTO, 1)), puerto.entre(DIA_AUTO, DIA_AUTO));
        assertEquals(3, puerto.entre(DIA_AUTO, DIA_AUTO.plusDays(2)).size());
        assertEquals(0, puerto.entre(DIA_AUTO.minusDays(10), DIA_AUTO.minusDays(1)).size());
    }

    @Test
    void archivoNuevo_reemplazaElPlan_yUnArchivoInvalidoNoTocaLaBase() throws IOException {
        try {
            Path nuevo = Files.writeString(carpeta.resolve("mant.preventivo.nuevo.txt"),
                    "20260115:TA01\n20260120:TB05\n");
            Sincronizacion cambio = carga(nuevo).sincronizar();
            assertEquals(new Sincronizacion(2, 1, 2, List.of()), cambio);
            assertEquals(List.of("2026-01-15:TA01", "2026-01-20:TB05"),
                    repositorio.listarTodos().stream().map(MantenimientoRegistrado::clave).toList());

            Path invalido = Files.writeString(carpeta.resolve("mant.preventivo.roto.txt"), "20260101:TA01\nroto\n");
            Sincronizacion rechazo = carga(invalido).sincronizar();
            assertFalse(rechazo.errores().isEmpty());
            assertEquals(2, repositorio.listarTodos().size());
        } finally {
            cargaDelSistema.sincronizar();
        }
    }

    private CargaMantenimientoSistema carga(Path archivo) {
        PropiedadesDominio base = PropiedadesPrueba.crear();
        PropiedadesDominio propiedades = new PropiedadesDominio(new PropiedadesDominio.Datos(base.datos().ventas(),
                base.datos().bloqueos(), archivo.toString()), base.ejecucion(), base.planificador(), base.semaforo());
        return new CargaMantenimientoSistema(repositorio, propiedades);
    }
}
