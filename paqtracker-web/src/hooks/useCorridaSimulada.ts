import { useEffect, useState } from 'react';
import type { EscenarioSimulacion } from '../types/simulacion';

// Reloj de una corrida simulada mientras paqtracker-api no lo publique por STOMP.
// El escenario de 5 días debe ejecutarse en 30–60 min reales (DA-08): por defecto se comprime con
// k = 180 (5 días en 40 min). `?velocidad=N` en la URL fija otro k para demostraciones y pruebas.

export const DURACION_CINCO_DIAS_MS = 5 * 24 * 3600 * 1000;
const K_POR_DEFECTO = 180;
export const VENTANA_EJECUCION_MIN = { minima: 30, maxima: 60 };

/** Instante simulado del colapso de ejemplo, desde el inicio de la corrida: 4 d 09 h 12 m 04 s. */
export const OFFSET_COLAPSO_MS = (((4 * 24 + 9) * 60 + 12) * 60 + 4) * 1000;

export type EstadoCorrida = 'EJECUCION' | 'COLAPSO' | 'COMPLETADA';

const factorDeVelocidad = () => {
  const valor = Number(new URLSearchParams(window.location.search).get('velocidad'));
  return Number.isFinite(valor) && valor > 0 ? valor : K_POR_DEFECTO;
};

export function useCorridaSimulada(escenario: EscenarioSimulacion, inicio: Date) {
  const [k] = useState(factorDeVelocidad);
  const [inicioReal] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());

  const limiteSimuladoMs = escenario === 'COLAPSO' ? OFFSET_COLAPSO_MS : DURACION_CINCO_DIAS_MS;
  const simuladoMs = Math.min((ahora - inicioReal) * k, limiteSimuladoMs);
  const terminada = simuladoMs >= limiteSimuladoMs;

  useEffect(() => {
    if (terminada) return;
    // 100 ms: el reloj y el desplazamiento de las unidades se ven continuos.
    const intervalo = setInterval(() => setAhora(Date.now()), 100);
    return () => clearInterval(intervalo);
  }, [terminada]);

  const estado: EstadoCorrida = !terminada ? 'EJECUCION' : escenario === 'COLAPSO' ? 'COLAPSO' : 'COMPLETADA';
  return {
    estado,
    relojSimulado: new Date(inicio.getTime() + simuladoMs),
    simuladoMs,
    /** Fracción del eje de 5 días recorrida (el colapso se detiene antes del final). */
    progreso: simuladoMs / DURACION_CINCO_DIAS_MS,
    dia: Math.min(5, Math.floor(simuladoMs / (24 * 3600 * 1000)) + 1),
    transcurridoRealMs: simuladoMs / k,
    restanteRealMs: (DURACION_CINCO_DIAS_MS - simuladoMs) / k,
    estimadoTotalRealMs: DURACION_CINCO_DIAS_MS / k,
  };
}
