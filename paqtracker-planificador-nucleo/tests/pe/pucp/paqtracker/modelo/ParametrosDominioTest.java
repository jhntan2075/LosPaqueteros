package pe.pucp.paqtracker.modelo;

import org.junit.jupiter.api.Test;
import pe.pucp.paqtracker.modelo.ParametrosDominio.ParametrosAlmacen;
import pe.pucp.paqtracker.modelo.ParametrosDominio.ParametrosAveria;
import pe.pucp.paqtracker.modelo.ParametrosDominio.ParametrosUnidad;
import pe.pucp.paqtracker.util.CalculadoraTiempos;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ParametrosDominioTest {

    private static Map<TipoVehiculo, ParametrosUnidad> unidadesPorDefecto() {
        Map<TipoVehiculo, ParametrosUnidad> unidades = new EnumMap<>(TipoVehiculo.class);
        for (TipoVehiculo tipo : TipoVehiculo.values()) {
            unidades.put(tipo, ParametrosUnidad.de(tipo));
        }
        return unidades;
    }

    @Test
    void porDefectoReproduceLasConstantesDelDominio() {
        ParametrosDominio parametros = ParametrosDominio.porDefecto();
        assertEquals(new ParametrosAlmacen(27, 14, 0), parametros.almacenes().get(0));
        assertEquals(new ParametrosAlmacen(12, 38, ConfiguracionDominio.STOCK_INTERMEDIO), parametros.almacenes().get(1));
        assertEquals(24, parametros.unidad(TipoVehiculo.AUTO).capacidad());
        assertEquals(ConfiguracionDominio.AVERIA_TIPO1_MINUTOS, parametros.averias().tipo1Minutos());
    }

    @Test
    void creaAlmacenesYFlotaConLosValoresConfigurados() {
        Map<TipoVehiculo, ParametrosUnidad> unidades = unidadesPorDefecto();
        unidades.put(TipoVehiculo.AUTO, new ParametrosUnidad(30, 60, 2.0));
        ParametrosDominio parametros = new ParametrosDominio(List.of(new ParametrosAlmacen(10, 10, 0),
                new ParametrosAlmacen(20, 20, 500), new ParametrosAlmacen(30, 30, 700)), unidades,
                ParametrosAveria.porDefecto());

        List<Almacen> almacenes = ConfiguracionDominio.crearAlmacenes(parametros);
        assertTrue(almacenes.get(0).esIlimitado());
        assertEquals(new Nodo(20, 20), almacenes.get(1).getUbicacion());
        assertEquals(700, almacenes.get(2).getCapacidadMaxima());

        Vehiculo auto = ConfiguracionDominio.crearFlota(almacenes.get(0), 1, 0, 0, parametros).get(0);
        assertEquals(30, auto.getCapacidad());
        assertEquals(60, auto.getVelocidad());
        assertEquals(2.0, auto.getCostoPorKm());
        // 60 km/h: un tramo de 30 km toma 30 min (con 40 km/h por defecto serian 45).
        assertEquals(30, CalculadoraTiempos.minutosDeViaje(30, auto));
    }

    @Test
    void rechazaAlmacenesFueraDeLaMallaRepetidosOSinCapacidad() {
        Map<TipoVehiculo, ParametrosUnidad> unidades = unidadesPorDefecto();
        ParametrosAveria averias = ParametrosAveria.porDefecto();
        assertThrows(IllegalArgumentException.class, () -> new ParametrosDominio(List.of(
                new ParametrosAlmacen(71, 10, 0), new ParametrosAlmacen(20, 20, 1), new ParametrosAlmacen(30, 30, 1)),
                unidades, averias));
        assertThrows(IllegalArgumentException.class, () -> new ParametrosDominio(List.of(
                new ParametrosAlmacen(10, 10, 0), new ParametrosAlmacen(10, 10, 1), new ParametrosAlmacen(30, 30, 1)),
                unidades, averias));
        assertThrows(IllegalArgumentException.class, () -> new ParametrosDominio(List.of(
                new ParametrosAlmacen(10, 10, 0), new ParametrosAlmacen(20, 20, 0), new ParametrosAlmacen(30, 30, 1)),
                unidades, averias));
        assertThrows(IllegalArgumentException.class, () -> new ParametrosDominio(List.of(
                new ParametrosAlmacen(10, 10, 0), new ParametrosAlmacen(20, 20, 1)), unidades, averias));
    }

    @Test
    void rechazaUnidadesYAveriasIncoherentes() {
        assertThrows(IllegalArgumentException.class, () -> new ParametrosUnidad(0, 40, 1.0));
        assertThrows(IllegalArgumentException.class, () -> new ParametrosUnidad(10, 0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> new ParametrosUnidad(10, 40, -1.0));
        assertThrows(IllegalArgumentException.class, () -> new ParametrosAveria(0, 240, 2880, 30));
        // El trasvase debe terminar antes de que la averiada se vaya.
        assertThrows(IllegalArgumentException.class, () -> new ParametrosAveria(30, 240, 2880, 30));
        // El tipo 3 no puede durar menos que su permanencia en el sitio.
        assertThrows(IllegalArgumentException.class, () -> new ParametrosAveria(120, 240, 200, 30));
    }

    @Test
    void lasDuracionesConfiguradasCambianTrasladoYReincorporacion() {
        ParametrosAveria duraciones = new ParametrosAveria(90, 180, 3 * 1440, 20);
        Averia tipo1 = new Averia(600, 0, TipoAveria.TIPO_1, duraciones);
        assertEquals(690, tipo1.getInstanteReincorporacion());
        Averia tipo2 = new Averia(600, 0, TipoAveria.TIPO_2, duraciones);
        assertEquals(780, tipo2.getInstanteTraslado());
        Averia tipo3 = new Averia(600, 0, TipoAveria.TIPO_3, duraciones);
        // 10:00 del dia 1 + 3 dias = 10:00 del dia 4 -> turno de las 15:00 del dia 4.
        assertEquals(3 * 1440 + 15 * 60, tipo3.getInstanteReincorporacion());
    }
}
