package pe.pucp.paqtracker.lectura;

import java.util.List;

/**
 * Resultado de validar un archivo de entrada linea por linea: cuantos
 * registros son validos y el detalle de las lineas rechazadas.
 */
public final class ResultadoValidacion {

    private final int registrosValidos;
    private final List<String> errores;

    /**
     * @param registrosValidos cantidad de lineas con un registro valido
     * @param errores          una descripcion por linea rechazada, con su numero de linea
     */
    public ResultadoValidacion(int registrosValidos, List<String> errores) {
        this.registrosValidos = registrosValidos;
        this.errores = List.copyOf(errores);
    }

    /**
     * @return verdadero si ninguna linea fue rechazada
     */
    public boolean esValido() {
        return errores.isEmpty();
    }

    public int getRegistrosValidos() {
        return registrosValidos;
    }

    public List<String> getErrores() {
        return errores;
    }
}
