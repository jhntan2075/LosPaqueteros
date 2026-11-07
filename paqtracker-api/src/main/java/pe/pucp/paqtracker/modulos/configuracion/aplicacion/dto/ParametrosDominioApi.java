package pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.modelo.ParametrosDominio;
import pe.pucp.paqtracker.modelo.TipoVehiculo;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Cuerpo de {@code GET} y {@code PUT /api/configuracion/parametros} (B02, B04, B07-B09). Los almacenes se
 * identifican por codigo (CENTRAL, INTERMEDIO_1, INTERMEDIO_2) y las unidades por tipo (AUTO, MOTO,
 * BICICLETA). La coherencia de los valores la valida {@link ParametrosDominio}.
 *
 * @param almacenes ubicacion y capacidad de cada almacen
 * @param unidades  capacidad, velocidad y costo por km de cada tipo de unidad
 * @param averias   duraciones de las averias, en minutos
 */
public record ParametrosDominioApi(@NotNull @Valid List<Almacen> almacenes, @NotNull @Valid List<Unidad> unidades,
                                   @NotNull @Valid Averias averias) {

    private static final List<String> CODIGOS_ALMACEN = List.of("CENTRAL", "INTERMEDIO_1", "INTERMEDIO_2");
    private static final List<String> NOMBRES_ALMACEN = List.of("Almacén central", "Almacén intermedio 1",
            "Almacén intermedio 2");
    private static final List<TipoVehiculo> ORDEN_TIPOS = List.of(TipoVehiculo.AUTO, TipoVehiculo.MOTOCICLETA,
            TipoVehiculo.BICICLETA);

    /**
     * @param codigo    CENTRAL, INTERMEDIO_1 o INTERMEDIO_2
     * @param nombre    nombre visible (solo en las respuestas; se ignora al guardar)
     * @param x         coordenada X en la malla
     * @param y         coordenada Y en la malla
     * @param capacidad stock al que se recarga cada dia; null en el central, que es ilimitado
     */
    public record Almacen(@NotBlank String codigo, String nombre, @NotNull Integer x, @NotNull Integer y,
                          Integer capacidad) {
    }

    /**
     * @param tipo         AUTO, MOTO o BICICLETA
     * @param capacidad    paquetes que transporta
     * @param velocidadKmH velocidad
     * @param costoPorKm   costo por kilometro
     */
    public record Unidad(@NotBlank String tipo, @NotNull Integer capacidad, @NotNull Integer velocidadKmH,
                         @NotNull Double costoPorKm) {
    }

    /**
     * @param tipo1Minutos            detencion en el sitio de una averia tipo 1
     * @param permanenciaSitioMinutos permanencia en el sitio de una averia tipo 2 o 3 antes del traslado
     * @param tipo3MinimoMinutos      no disponibilidad minima de una averia tipo 3
     * @param trasvaseMinutos         duracion del trasvase de carga a otra unidad
     */
    public record Averias(@NotNull Integer tipo1Minutos, @NotNull Integer permanenciaSitioMinutos,
                          @NotNull Integer tipo3MinimoMinutos, @NotNull Integer trasvaseMinutos) {
    }

    /**
     * @param parametros parametros del dominio
     * @return cuerpo de la respuesta
     */
    public static ParametrosDominioApi desde(ParametrosDominio parametros) {
        List<Almacen> almacenes = new ArrayList<>();
        for (int i = 0; i < parametros.almacenes().size(); i++) {
            ParametrosDominio.ParametrosAlmacen almacen = parametros.almacenes().get(i);
            almacenes.add(new Almacen(CODIGOS_ALMACEN.get(i), NOMBRES_ALMACEN.get(i), almacen.x(), almacen.y(),
                    i == 0 ? null : almacen.capacidad()));
        }
        List<Unidad> unidades = new ArrayList<>();
        for (TipoVehiculo tipo : ORDEN_TIPOS) {
            ParametrosDominio.ParametrosUnidad unidad = parametros.unidad(tipo);
            unidades.add(new Unidad(tipoVisible(tipo), unidad.capacidad(), unidad.velocidadKmH(),
                    unidad.costoPorKm()));
        }
        ParametrosDominio.ParametrosAveria averias = parametros.averias();
        return new ParametrosDominioApi(almacenes, unidades, new Averias(averias.tipo1Minutos(),
                averias.permanenciaSitioMinutos(), averias.tipo3MinimoMinutos(), averias.trasvaseMinutos()));
    }

    /**
     * @return parametros del dominio, validados
     * @throws SolicitudInvalidaException si falta o se repite un almacen o un tipo, o los valores no son
     *                                    coherentes
     */
    public ParametrosDominio aDominio() {
        try {
            ParametrosDominio.ParametrosAlmacen[] porId =
                    new ParametrosDominio.ParametrosAlmacen[CODIGOS_ALMACEN.size()];
            for (Almacen almacen : almacenes) {
                int id = CODIGOS_ALMACEN.indexOf(almacen.codigo());
                if (id < 0) {
                    throw new IllegalArgumentException("Almacén desconocido: " + almacen.codigo()
                            + " (use CENTRAL, INTERMEDIO_1 o INTERMEDIO_2)");
                }
                if (porId[id] != null) {
                    throw new IllegalArgumentException("El almacén " + almacen.codigo() + " está repetido");
                }
                int capacidad = id == 0 || almacen.capacidad() == null ? 0 : almacen.capacidad();
                porId[id] = new ParametrosDominio.ParametrosAlmacen(almacen.x(), almacen.y(), capacidad);
            }
            List<ParametrosDominio.ParametrosAlmacen> lista = new ArrayList<>();
            for (int i = 0; i < porId.length; i++) {
                if (porId[i] == null) {
                    throw new IllegalArgumentException("Falta el almacén " + CODIGOS_ALMACEN.get(i));
                }
                lista.add(porId[i]);
            }
            Map<TipoVehiculo, ParametrosDominio.ParametrosUnidad> porTipo = new EnumMap<>(TipoVehiculo.class);
            for (Unidad unidad : unidades) {
                TipoVehiculo tipo = tipoDelNucleo(unidad.tipo());
                if (porTipo.put(tipo, new ParametrosDominio.ParametrosUnidad(unidad.capacidad(),
                        unidad.velocidadKmH(), unidad.costoPorKm())) != null) {
                    throw new IllegalArgumentException("La unidad " + unidad.tipo() + " está repetida");
                }
            }
            return new ParametrosDominio(lista, porTipo, new ParametrosDominio.ParametrosAveria(
                    averias.tipo1Minutos(), averias.permanenciaSitioMinutos(), averias.tipo3MinimoMinutos(),
                    averias.trasvaseMinutos()));
        } catch (IllegalArgumentException excepcion) {
            throw new SolicitudInvalidaException(excepcion.getMessage());
        }
    }

    private static String tipoVisible(TipoVehiculo tipo) {
        return tipo == TipoVehiculo.MOTOCICLETA ? "MOTO" : tipo.name();
    }

    private static TipoVehiculo tipoDelNucleo(String tipo) {
        return switch (tipo) {
            case "AUTO" -> TipoVehiculo.AUTO;
            case "MOTO" -> TipoVehiculo.MOTOCICLETA;
            case "BICICLETA" -> TipoVehiculo.BICICLETA;
            default -> throw new IllegalArgumentException("Tipo de unidad desconocido: " + tipo
                    + " (use AUTO, MOTO o BICICLETA)");
        };
    }
}
