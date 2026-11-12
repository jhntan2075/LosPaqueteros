package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.servicio;

import pe.pucp.paqtracker.modulos.ejecucion.dominio.AvancePedido;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RepositorioEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import java.util.List;
import java.util.function.Consumer;

/**
 * Lo que un motor guarda de si mismo: su fila en {@code ejecucion} (con el contexto para reproducirla) y, en
 * el dia a dia, el avance de sus pedidos.
 *
 * @param repositorio     persistencia de la ejecucion
 * @param avance          destino del avance de los pedidos; no hace nada fuera del dia a dia
 * @param origenDatos     SISTEMA o ARCHIVO
 * @param semilla         semilla del planificador
 * @param parametros      parametros del dominio y rangos del semaforo vigentes al crearla, en JSON
 * @param resultadoPrevio lo operado antes de un reinicio (dia a dia); VACIO en los demas casos
 */
public record PersistenciaEjecucion(RepositorioEjecucion repositorio, Consumer<List<AvancePedido>> avance,
                                    String origenDatos, Long semilla, String parametros,
                                    ResultadoEjecucion resultadoPrevio) {

    /**
     * @param repositorio persistencia de la ejecucion
     * @return persistencia sin avance de pedidos ni contexto, para pruebas y simulaciones simples
     */
    public static PersistenciaEjecucion soloRegistro(RepositorioEjecucion repositorio) {
        return new PersistenciaEjecucion(repositorio, avances -> { }, "SISTEMA", null, null,
                ResultadoEjecucion.VACIO);
    }
}
