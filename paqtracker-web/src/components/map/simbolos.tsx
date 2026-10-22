import React from 'react';
import { BLANCO, CRITICO, CRITICO_SUAVE, NEUTRO } from '../../config/colores';

// Símbolos del mapa como elementos SVG, con la geometría de los frames de Figma (pin de destino,
// depósito central e intermedio). Los usan el mapa y su leyenda, para que la leyenda muestre
// exactamente lo que se ve en el mapa. Cada símbolo se dibuja respecto de su punto de anclaje (0, 0).

const SOMBRA = 'drop-shadow(0px 1px 1.5px rgba(0,0,0,0.24))';

/** Gota de 18 × 24 con la punta en (0, 0) y la cabeza circular centrada en (0, -15). */
const PIN_PATH = 'M0 0C-3.4 -5.4 -9 -10.4 -9 -15C-9 -19.97 -4.97 -24 0 -24C4.97 -24 9 -19.97 9 -15C9 -10.4 3.4 -5.4 0 0Z';
/** Centro de la cabeza del pin, para el halo de selección. */
export const CENTRO_CABEZA_PIN = -15;

/**
 * Pin de destino: la punta marca el nodo de entrega y el color es la holgura del pedido. El crítico
 * lleva un signo de admiración además del rojo, para no depender solo del color.
 */
export const PinDestino: React.FC<{ color: string; critico?: boolean }> = ({ color, critico = false }) => (
  <>
    <path d={PIN_PATH} fill={color} stroke={BLANCO} strokeWidth="1.5" strokeLinejoin="round" filter={SOMBRA} />
    {critico ? (
      <>
        <rect x="-1" y="-20" width="2" height="5.5" rx="1" fill={BLANCO} />
        <circle cx="0" cy="-11.6" r="1.2" fill={BLANCO} />
      </>
    ) : (
      <circle cx="0" cy={CENTRO_CABEZA_PIN} r="3" fill={BLANCO} />
    )}
  </>
);

/** Depósito central (28 × 26, centrado en el nodo): silueta rellena con puerta. */
export const AlmacenCentral: React.FC = () => (
  <>
    <path d="M0 -13L14 -4V13H-14V-4L0 -13Z" fill={NEUTRO[900]} stroke={BLANCO} strokeWidth="2" strokeLinejoin="round" filter={SOMBRA} />
    <rect x="-4" y="3" width="8" height="10" rx="1" fill={BLANCO} />
  </>
);

/**
 * Depósito intermedio (24 × 22, centrado en el nodo): misma silueta sin rellenar; la barra interior
 * es el stock y el color del contorno y de la barra, su semáforo.
 */
export const AlmacenIntermedio: React.FC<{ color: string; fraccionStock?: number }> = ({ color, fraccionStock }) => {
  const alto = 12 * Math.min(1, Math.max(0, fraccionStock ?? 0));
  return (
    <>
      <path d="M0 -11L12 -3V11H-12V-3L0 -11Z" fill={BLANCO} stroke={color} strokeWidth="2" strokeLinejoin="round" filter={SOMBRA} />
      <rect x="-10" y="-2" width="20" height="12" rx="1" fill={NEUTRO[200]} />
      {fraccionStock !== undefined && <rect x="-10" y={10 - alto} width="20" height={alto} rx="1" fill={color} />}
    </>
  );
};

/** Tramo bloqueado: aspa roja sobre fondo claro, centrada en el punto medio del tramo. */
export const MarcaBloqueo: React.FC = () => (
  <>
    <circle r="10" fill={CRITICO_SUAVE} />
    <path d="M -6 -6 L 6 6 M -6 6 L 6 -6" stroke={CRITICO} strokeWidth="2.5" />
  </>
);
