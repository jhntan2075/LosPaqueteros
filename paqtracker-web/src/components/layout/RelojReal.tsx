import React, { useEffect, useState } from 'react';
import { formatearFechaLarga, formatearHora } from '../../lib/formato';

/** Fecha y hora real del equipo, con segundos; se actualiza sola cada segundo. `soloHora`: "15:04:05". */
export const RelojReal: React.FC<{ className?: string; soloHora?: boolean }> = ({ className, soloHora = false }) => {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(intervalo);
  }, []);
  const texto = soloHora ? `${formatearHora(ahora)}:${String(ahora.getSeconds()).padStart(2, '0')}` : formatearFechaLarga(ahora);
  return <span className={className}>{texto}</span>;
};
