import React, { useEffect, useState } from 'react';
import { formatearFechaLarga } from '../../lib/formato';

/** Fecha y hora real del equipo, con segundos; se actualiza sola cada segundo. */
export const RelojReal: React.FC<{ className?: string }> = ({ className }) => {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);
  return <span className={className}>{formatearFechaLarga(ahora)}</span>;
};
