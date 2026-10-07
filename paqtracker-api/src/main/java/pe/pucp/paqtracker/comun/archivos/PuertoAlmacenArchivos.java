package pe.pucp.paqtracker.comun.archivos;

import java.time.YearMonth;

/**
 * Puerto de salida para guardar los archivos de entrada que sube el usuario.
 */
public interface PuertoAlmacenArchivos {

    /**
     * Guarda el archivo de ventas de un mes donde lo leen las ejecuciones, reemplazando el anterior.
     *
     * @param mes       mes de las ventas
     * @param contenido contenido del archivo ya validado
     */
    void guardarVentas(YearMonth mes, byte[] contenido);
}
