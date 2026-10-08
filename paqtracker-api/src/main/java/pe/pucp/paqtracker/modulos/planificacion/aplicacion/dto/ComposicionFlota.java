package pe.pucp.paqtracker.modulos.planificacion.aplicacion.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import pe.pucp.paqtracker.modelo.ConfiguracionDominio;

/**
 * Cantidad de unidades de cada tipo con la que corre una ejecucion (LE-019, LE-051).
 *
 * @param autos      cantidad de autos
 * @param motos      cantidad de motocicletas
 * @param bicicletas cantidad de bicicletas
 */
public record ComposicionFlota(@NotNull @Min(0) Integer autos, @NotNull @Min(0) Integer motos,
                               @NotNull @Min(0) Integer bicicletas) {

    /**
     * @return la flota de la operacion definida en el dominio
     */
    public static ComposicionFlota porDefecto() {
        return new ComposicionFlota(ConfiguracionDominio.CANTIDAD_AUTOS, ConfiguracionDominio.CANTIDAD_MOTOS,
                ConfiguracionDominio.CANTIDAD_BICICLETAS);
    }

    /**
     * @return total de unidades
     */
    public int total() {
        return autos + motos + bicicletas;
    }
}
