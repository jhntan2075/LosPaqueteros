import { useEffect, useState } from 'react';

/** Segundos reales transcurridos desde `instanteMs` (Date.now), recalculados cada segundo; 0 si aún no hay instante. */
export function useSegundosDesde(instanteMs: number): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(temporizador);
  }, []);
  return instanteMs === 0 ? 0 : Math.max(0, Math.round((ahora - instanteMs) / 1000));
}
