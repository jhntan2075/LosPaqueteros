import { useEffect, useState } from 'react';

/** Fecha y hora real del equipo; se actualiza cada segundo. */
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);
  return ahora;
}
