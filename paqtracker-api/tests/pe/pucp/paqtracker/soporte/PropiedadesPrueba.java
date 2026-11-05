package pe.pucp.paqtracker.soporte;

import pe.pucp.paqtracker.comun.configuracion.PropiedadesDominio;
import pe.pucp.paqtracker.modulos.configuracion.dominio.FuenteRangosSemaforo;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;

/**
 * Propiedades de la operacion para pruebas unitarias, con los mismos valores por defecto que
 * application.yml.
 */
public final class PropiedadesPrueba {

    /**
     * @return propiedades con los valores por defecto
     */
    public static PropiedadesDominio crear() {
        return new PropiedadesDominio(
                new PropiedadesDominio.Datos("tests-resources/datos/ventas", "tests-resources/datos/bloqueos"),
                new PropiedadesDominio.Ejecucion("America/Lima", 1, 30, 180, 180, 7, 30, 4, 3, 50, false),
                new PropiedadesDominio.Planificador("GA", 1L),
                new PropiedadesDominio.Semaforo(0.15, 0.40, 0.20, 0.50));
    }

    /**
     * @return fuente fija con los rangos del semaforo iniciales (los de application.yml)
     */
    public static FuenteRangosSemaforo rangosSemaforo() {
        RangosSemaforo rangos = RangosSemaforo.inicial(crear().semaforo());
        return () -> rangos;
    }

    private PropiedadesPrueba() {
    }
}
