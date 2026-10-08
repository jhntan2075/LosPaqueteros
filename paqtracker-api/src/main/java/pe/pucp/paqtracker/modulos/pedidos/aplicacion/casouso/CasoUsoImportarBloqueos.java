package pe.pucp.paqtracker.modulos.pedidos.aplicacion.casouso;

import org.springframework.stereotype.Service;
import pe.pucp.paqtracker.comun.archivos.MesArchivo;
import pe.pucp.paqtracker.comun.archivos.PuertoAlmacenArchivos;
import pe.pucp.paqtracker.comun.excepcion.SolicitudInvalidaException;
import pe.pucp.paqtracker.lectura.CargadorBloqueos;
import pe.pucp.paqtracker.lectura.ResultadoValidacion;
import pe.pucp.paqtracker.modulos.pedidos.aplicacion.dto.RespuestaImportacion;
import java.nio.charset.StandardCharsets;
import java.time.YearMonth;
import java.util.List;

/**
 * Importa el archivo de bloqueos de un mes con la misma validacion linea por linea que CU-02: si no
 * tiene errores, lo deja disponible para las simulaciones de ese mes (LE-036).
 */
@Service
public class CasoUsoImportarBloqueos {

    private final PuertoAlmacenArchivos almacenArchivos;

    /**
     * @param almacenArchivos almacenamiento de archivos de entrada
     */
    public CasoUsoImportarBloqueos(PuertoAlmacenArchivos almacenArchivos) {
        this.almacenArchivos = almacenArchivos;
    }

    /**
     * @param mes       mes del archivo, en formato YYYYMM
     * @param contenido contenido del archivo, en UTF-8
     * @return bloqueos validos y errores por linea; el archivo se guarda solo si no hay errores
     * @throws SolicitudInvalidaException si el mes no tiene formato YYYYMM o el archivo esta vacio
     */
    public RespuestaImportacion ejecutar(String mes, byte[] contenido) {
        YearMonth mesArchivo = MesArchivo.interpretar(mes);
        if (contenido == null || contenido.length == 0) {
            throw new SolicitudInvalidaException("El archivo de bloqueos esta vacio");
        }
        List<String> lineas = new String(contenido, StandardCharsets.UTF_8).lines().toList();
        ResultadoValidacion validacion = CargadorBloqueos.validar(lineas);
        boolean guardar = validacion.esValido() && validacion.getRegistrosValidos() > 0;
        if (guardar) {
            almacenArchivos.guardarBloqueos(mesArchivo, contenido);
        }
        return new RespuestaImportacion(mes, validacion.getRegistrosValidos(), validacion.getErrores(),
                validacion.getLineasInvalidas(), guardar);
    }
}
