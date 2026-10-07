package pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto;

import java.util.List;

/**
 * Resultado de importar un archivo de ventas (CU-02).
 *
 * @param mes              mes del archivo, YYYYMM
 * @param registrosValidos lineas con un pedido valido
 * @param errores          una descripcion por linea invalida
 * @param guardado         verdadero si el archivo quedo disponible para las simulaciones
 */
public record RespuestaImportacion(String mes, int registrosValidos, List<String> errores, boolean guardado) {
}
