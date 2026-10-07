package pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto;

import java.util.List;

/**
 * Resultado de importar un archivo de entrada (ventas o bloqueos) de un mes.
 *
 * @param mes              mes del archivo, YYYYMM
 * @param registrosValidos lineas con un registro valido
 * @param errores          una descripcion por linea invalida
 * @param lineasInvalidas  numeros de las lineas invalidas, empezando en 1
 * @param guardado         verdadero si el archivo quedo disponible para las simulaciones
 */
public record RespuestaImportacion(String mes, int registrosValidos, List<String> errores,
                                   List<Integer> lineasInvalidas, boolean guardado) {
}
