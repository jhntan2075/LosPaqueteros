package pe.pucp.paqtracker.modulos.configuracion.aplicacion.dto;

import pe.pucp.paqtracker.modulos.difusion.aplicacion.dto.AlmacenEnMapa;
import java.util.List;

/**
 * Parametros del dominio que el front necesita para dibujar y validar: malla, almacenes, flota,
 * plazos y turnos. Reemplaza la copia que el front tenia en su propio codigo.
 *
 * @param mallaAnchoKm          ancho de la malla
 * @param mallaAltoKm           alto de la malla
 * @param tiempoServicioMinutos acondicionamiento por entrega
 * @param plazoMaximoHoras      plazo de entrega maximo
 * @param iniciosTurnoMinutos   minuto del dia en que inicia cada turno
 * @param almacenes             almacenes y su ubicacion
 * @param tiposUnidad           tipos de unidad de la flota
 */
public record RespuestaConfiguracionDominio(int mallaAnchoKm, int mallaAltoKm, int tiempoServicioMinutos,
                                            int plazoMaximoHoras, int[] iniciosTurnoMinutos,
                                            List<AlmacenEnMapa> almacenes, List<TipoUnidad> tiposUnidad) {

    /**
     * @param tipo         AUTO, MOTO o BICICLETA
     * @param capacidad    paquetes que transporta
     * @param velocidadKmH velocidad
     * @param costoPorKm   costo por kilometro
     * @param cantidad     unidades de este tipo en la flota
     */
    public record TipoUnidad(String tipo, int capacidad, int velocidadKmH, double costoPorKm, int cantidad) {
    }
}
