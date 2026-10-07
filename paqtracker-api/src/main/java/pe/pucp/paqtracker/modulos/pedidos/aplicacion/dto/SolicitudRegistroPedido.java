package pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Datos de un pedido ingresado manualmente (CU-01). Los limites de la malla y del plazo se revisan
 * tambien en el caso de uso contra la configuracion del dominio.
 *
 * @param cliente    cliente que lo solicita
 * @param x          coordenada horizontal del destino, en km
 * @param y          coordenada vertical del destino, en km
 * @param cantidad   paquetes
 * @param plazoHoras plazo de entrega, en horas
 */
public record SolicitudRegistroPedido(@NotBlank @Size(max = 80) String cliente, @NotNull @Min(0) Integer x,
                                      @NotNull @Min(0) Integer y, @NotNull @Positive Integer cantidad,
                                      @NotNull @Positive Integer plazoHoras) {
}
