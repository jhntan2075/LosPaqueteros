import { useEffect, useState } from 'react';

/** Factores de reproducción disponibles sin conexión (×1 = tiempo real, el del escenario día a día). */
export const VELOCIDADES_REPRODUCCION = [1, 10, 60, 300] as const;
export type VelocidadReproduccion = (typeof VELOCIDADES_REPRODUCCION)[number];

/**
 * Reloj de operación día a día mientras no hay conexión STOMP: parte de `base` y avanza `velocidad`
 * segundos simulados por segundo real. Al cambiar la velocidad, el reloj continúa desde el instante
 * actual (sin saltos).
 */
export function useRelojEnVivo(base: Date, velocidadInicial: VelocidadReproduccion = 1) {
  const [ancla, setAncla] = useState(() => ({ real: Date.now(), simulado: base.getTime(), velocidad: velocidadInicial }));
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    // Con velocidades altas se refresca más seguido para que el movimiento se vea continuo.
    const intervalo = setInterval(() => setAhora(Date.now()), ancla.velocidad > 1 ? 100 : 1000);
    return () => clearInterval(intervalo);
  }, [ancla.velocidad]);

  const reloj = new Date(ancla.simulado + (ahora - ancla.real) * ancla.velocidad);

  const cambiarVelocidad = (velocidad: VelocidadReproduccion) => {
    const real = Date.now();
    setAncla((previa) => ({ real, simulado: previa.simulado + (real - previa.real) * previa.velocidad, velocidad }));
    setAhora(real);
  };

  return { reloj, velocidad: ancla.velocidad, cambiarVelocidad };
}
