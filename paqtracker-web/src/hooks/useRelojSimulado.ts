import { useEffect, useState } from 'react';
import type { MensajeEstadoApi } from '../types/api';

// Reloj simulado interpolado en el cliente entre dos instantáneas: parte del reloj de la última
// instantánea y avanza con el factor k mientras la ejecución está en curso. Así el reloj y las
// unidades se mueven de forma continua aunque el servidor difunda cada Sc (1 s).

const REFRESCO_MS = 100;
/** Sin instantáneas nuevas, se extrapola como máximo este tiempo real (evita derivar si se cae la conexión). */
const MAXIMA_EXTRAPOLACION_MS = 5000;

export function useRelojSimulado(mensaje: MensajeEstadoApi | null, recibidoEnMs: number): number | null {
  const [ahora, setAhora] = useState(() => Date.now());
  const corriendo = mensaje?.estado === 'EN_CURSO';

  useEffect(() => {
    if (!corriendo) return undefined;
    const intervalo = setInterval(() => setAhora(Date.now()), REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [corriendo]);

  if (!mensaje) return null;
  if (!corriendo) return mensaje.relojSimuladoMs;
  const transcurrido = Math.min(Math.max(0, ahora - recibidoEnMs), MAXIMA_EXTRAPOLACION_MS);
  return mensaje.relojSimuladoMs + transcurrido * mensaje.factorAceleracion;
}
