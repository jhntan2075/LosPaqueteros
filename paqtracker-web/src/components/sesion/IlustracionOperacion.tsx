import React, { useEffect, useState } from 'react';

// Ilustración del panel de marca del login: la malla de la ciudad con los tres almacenes, un bloqueo y
// unidades que recorren rutas en ángulo recto. Es decorativa (antes de iniciar sesión la API no entrega
// datos): las figuras de los almacenes son las de simbolos.tsx, con los colores del semáforo.

const usaMovimientoReducido = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const RUTAS = [
  { id: 'ilu-ruta-1', d: 'M168 280 H308 V196 H448 V140', color: '#1586D7', duracion: '9s', inicio: '0s' },
  { id: 'ilu-ruta-2', d: 'M168 280 V420 H336 V476 H504', color: '#1586D7', duracion: '11s', inicio: '-4s' },
  { id: 'ilu-ruta-3', d: 'M392 364 H280 V252 H84 V168', color: '#FB8229', duracion: '13s', inicio: '-2s' },
];

const AlmacenCentral: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y}) scale(0.9)`}>
    <path d="M0 -13L14 -4V13H-14V-4L0 -13Z" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
    <rect x="-4" y="3" width="8" height="10" rx="1" fill="#FFFFFF" />
  </g>
);

const AlmacenIntermedio: React.FC<{ x: number; y: number; color: string; fraccion: number }> = ({ x, y, color, fraccion }) => {
  const alto = 12 * fraccion;
  return (
    <g transform={`translate(${x} ${y}) scale(0.9)`}>
      <path d="M0 -11L12 -3V11H-12V-3L0 -11Z" fill="#FFFFFF" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="-10" y="-2" width="20" height="12" rx="1" fill="#E2E8F0" />
      <rect x="-10" y={10 - alto} width="20" height={alto} rx="1" fill={color} />
    </g>
  );
};

/** Marcas de la leyenda del panel de marca (login): las mismas figuras de almacén, en miniatura. */
export const MarcaLeyendaCentral: React.FC = () => (
  <svg width="12" height="11" viewBox="-15 -14 30 28" aria-hidden="true">
    <path d="M0 -13L14 -4V13H-14V-4L0 -13Z" fill="#0F172A" stroke="#fff" strokeWidth="2.5" />
  </svg>
);

export const MarcaLeyendaIntermedio: React.FC = () => (
  <svg width="11" height="10" viewBox="-13 -12 26 24" aria-hidden="true">
    <path d="M0 -11L12 -3V11H-12V-3L0 -11Z" fill="#fff" stroke="#15803D" strokeWidth="2.5" />
  </svg>
);

export const IlustracionOperacion: React.FC = () => {
  const [animar, setAnimar] = useState(() => !usaMovimientoReducido());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const alCambiar = () => setAnimar(!consulta.matches);
    consulta.addEventListener?.('change', alCambiar);
    return () => consulta.removeEventListener?.('change', alCambiar);
  }, []);

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 560 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="ilu-malla" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="#1E2A47" strokeWidth="1" />
        </pattern>
        <linearGradient id="ilu-desvanecido" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0D152E" stopOpacity=".85" />
          <stop offset=".35" stopColor="#0D152E" stopOpacity=".15" />
          <stop offset=".7" stopColor="#0D152E" stopOpacity=".15" />
          <stop offset="1" stopColor="#0D152E" stopOpacity=".9" />
        </linearGradient>
      </defs>
      <rect width="560" height="560" fill="url(#ilu-malla)" />

      {/* Avenidas */}
      <g stroke="#2F3C57" strokeWidth="2">
        <path d="M0 196H560" />
        <path d="M0 364H560" />
        <path d="M168 0V560" />
        <path d="M392 0V560" />
      </g>

      {/* Rutas */}
      {RUTAS.map((r) => (
        <path key={r.id} id={r.id} d={r.d} fill="none" stroke={r.color} strokeWidth="2.5" strokeDasharray="6 5" opacity=".9" />
      ))}

      {/* Bloqueo */}
      <g>
        <path d="M224 364 H280" stroke="#C81E3A" strokeWidth="4" strokeLinecap="round" />
        <circle cx="252" cy="364" r="8" fill="#0D152E" stroke="#C81E3A" strokeWidth="2" />
        <path d="M248 360l8 8M256 360l-8 8" stroke="#C81E3A" strokeWidth="2" />
      </g>

      {/* Destinos */}
      <g fill="#0D152E" stroke="#8190AA" strokeWidth="2">
        <circle cx="448" cy="140" r="5" />
        <circle cx="504" cy="476" r="5" />
        <circle cx="84" cy="168" r="5" />
        <circle cx="476" cy="308" r="5" />
        <circle cx="112" cy="448" r="5" />
      </g>

      {/* Almacenes */}
      <g fontFamily='"Fira Sans", system-ui, sans-serif' fontSize="12" fontWeight="500" fill="#A9B4C8">
        <AlmacenCentral x={168} y={280} />
        <text x="186" y="284">Central</text>
        <AlmacenIntermedio x={392} y={364} color="#15803D" fraccion={0.6} />
        <text x="406" y="368">Interm. 1 / 60 %</text>
        <AlmacenIntermedio x={84} y={84} color="#B45309" fraccion={0.4} />
        <text x="98" y="88">Interm. 2 / 40 %</text>
      </g>

      {/* Unidades: recorren su ruta en bucle; quietas al inicio de la ruta si se pide menos movimiento */}
      {RUTAS.map((r) => {
        const [, x, y] = /^M(\d+) (\d+)/.exec(r.d) ?? [];
        return (
          <circle key={r.id} r="7" fill={r.color} stroke="#FFFFFF" strokeWidth="2" cx={animar ? undefined : x} cy={animar ? undefined : y}>
            {animar && (
              <animateMotion dur={r.duracion} begin={r.inicio} repeatCount="indefinite">
                <mpath href={`#${r.id}`} />
              </animateMotion>
            )}
          </circle>
        );
      })}

      <rect width="560" height="560" fill="url(#ilu-desvanecido)" />
    </svg>
  );
};
