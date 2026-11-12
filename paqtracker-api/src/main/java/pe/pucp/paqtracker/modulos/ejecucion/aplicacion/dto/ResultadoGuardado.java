package pe.pucp.paqtracker.modulos.ejecucion.aplicacion.dto;

import pe.pucp.paqtracker.modulos.ejecucion.dominio.ColapsoRegistrado;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.RegistroEjecucion;
import pe.pucp.paqtracker.modulos.ejecucion.dominio.ResultadoEjecucion;
import java.time.Instant;

/**
 * Resultado guardado de una ejecucion que ya no esta en memoria (corrida pasada o de antes de un reinicio).
 *
 * @param metricas                metricas del resultado
 * @param tiempoComputoPromedioMs tiempo de computo promedio por planificacion
 * @param colapso                 instante y causa del colapso, o null
 * @param origenDatos             SISTEMA o ARCHIVO
 * @param semilla                 semilla del planificador, o null
 * @param relojAlcanzado          instante simulado hasta el que llego, o null
 * @param creadaEn                instante real de creacion
 * @param finalizadaEn            instante real de termino, o null
 */
public record ResultadoGuardado(ResultadoEjecucion metricas, double tiempoComputoPromedioMs, ColapsoRegistrado colapso,
                                String origenDatos, Long semilla, Instant relojAlcanzado, Instant creadaEn,
                                Instant finalizadaEn) {

    /**
     * @param registro ejecucion guardada
     * @return su resultado para la API
     */
    public static ResultadoGuardado de(RegistroEjecucion registro) {
        return new ResultadoGuardado(registro.resultado(), registro.resultado().tiempoComputoPromedioMs(),
                registro.colapso(), registro.origenDatos(), registro.semilla(), registro.relojAlcanzado(),
                registro.creadaEn(), registro.finalizadaEn());
    }
}
