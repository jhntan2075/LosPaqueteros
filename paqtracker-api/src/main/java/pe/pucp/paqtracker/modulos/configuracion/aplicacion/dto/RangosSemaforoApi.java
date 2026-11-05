package pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import pe.pucp.paqtracker.modulos.configuracion.dominio.RangosSemaforo;

/**
 * Cuerpo de {@code GET} y {@code PUT /api/configuracion/semaforo}. Todos los umbrales son fracciones entre 0
 * y 1 (0,15 = 15 %). El orden de los umbrales lo valida {@link RangosSemaforo}.
 *
 * @param holgura          holgura restante del pedido sobre su plazo: rojo &lt; ambar
 * @param inventario       stock de un almacen intermedio sobre su capacidad (stock bajo): rojo &lt; ambar
 * @param ocupacionUnidad  carga de una unidad sobre su capacidad: vacio &lt; ambar &lt; rojo
 * @param ocupacionAlmacen stock de un almacen intermedio sobre su capacidad: vacio &lt; ambar &lt; rojo
 */
public record RangosSemaforoApi(@NotNull @Valid PorDebajo holgura, @NotNull @Valid PorDebajo inventario,
                                @NotNull @Valid Carga ocupacionUnidad, @NotNull @Valid Carga ocupacionAlmacen) {

    /**
     * @param rojo  fraccion bajo la que el nivel es rojo
     * @param ambar fraccion bajo la que el nivel es ambar
     */
    public record PorDebajo(@NotNull Double rojo, @NotNull Double ambar) {
    }

    /**
     * @param vacio fraccion hasta la que se considera vacio (0 = solo sin carga)
     * @param ambar fraccion desde la que el nivel es ambar
     * @param rojo  fraccion desde la que el nivel es rojo
     */
    public record Carga(@NotNull Double vacio, @NotNull Double ambar, @NotNull Double rojo) {
    }

    /**
     * @param rangos rangos del dominio
     * @return cuerpo de la respuesta
     */
    public static RangosSemaforoApi desde(RangosSemaforo rangos) {
        return new RangosSemaforoApi(
                new PorDebajo(rangos.holgura().rojo(), rangos.holgura().ambar()),
                new PorDebajo(rangos.inventario().rojo(), rangos.inventario().ambar()),
                new Carga(rangos.ocupacionUnidad().vacio(), rangos.ocupacionUnidad().ambar(),
                        rangos.ocupacionUnidad().rojo()),
                new Carga(rangos.ocupacionAlmacen().vacio(), rangos.ocupacionAlmacen().ambar(),
                        rangos.ocupacionAlmacen().rojo()));
    }

    /**
     * @return rangos del dominio, validados
     * @throws pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException si los umbrales no son coherentes
     */
    public RangosSemaforo aDominio() {
        return new RangosSemaforo(new RangosSemaforo.CortesPorDebajo(holgura.rojo(), holgura.ambar()),
                new RangosSemaforo.CortesPorDebajo(inventario.rojo(), inventario.ambar()),
                new RangosSemaforo.CortesCarga(ocupacionUnidad.vacio(), ocupacionUnidad.ambar(),
                        ocupacionUnidad.rojo()),
                new RangosSemaforo.CortesCarga(ocupacionAlmacen.vacio(), ocupacionAlmacen.ambar(),
                        ocupacionAlmacen.rojo()));
    }
}
