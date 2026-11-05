import React from 'react';
import { COLOR_SEMAFORO, type NivelCarga } from '../../lib/semaforo';
import { COLOR_AVERIA } from './iconosVehiculo';

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
/** Pin del pedido que una unidad está entregando en este momento: distinto de los colores de holgura. */
export const COLOR_EN_ENTREGA = '#7C3AED';

export const PinDestino: React.FC<{ color: string; critico?: boolean }> = ({ color, critico = false }) => (
  <>
    <path d={PIN_PATH} fill={color} stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" filter={SOMBRA} />
    {critico ? (
      <>
        <rect x="-1" y="-20" width="2" height="5.5" rx="1" fill="#FFFFFF" />
        <circle cx="0" cy="-11.6" r="1.2" fill="#FFFFFF" />
      </>
    ) : (
      <circle cx="0" cy={CENTRO_CABEZA_PIN} r="3" fill="#FFFFFF" />
    )}
  </>
);

/** Depósito central (28 × 26, centrado en el nodo): silueta rellena con puerta. */
export const AlmacenCentral: React.FC = () => (
  <>
    <path d="M0 -13L14 -4V13H-14V-4L0 -13Z" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" filter={SOMBRA} />
    <rect x="-4" y="3" width="8" height="10" rx="1" fill="#FFFFFF" />
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
      <path d="M0 -11L12 -3V11H-12V-3L0 -11Z" fill="#FFFFFF" stroke={color} strokeWidth="2" strokeLinejoin="round" filter={SOMBRA} />
      <rect x="-10" y="-2" width="20" height="12" rx="1" fill="#E2E8F0" />
      {fraccionStock !== undefined && <rect x="-10" y={10 - alto} width="20" height={alto} rx="1" fill={color} />}
    </>
  );
};

/**
 * Marca de 9 px del semáforo + vacío: la forma también distingue el nivel (anillo vacío, cuadrado verde,
 * triángulo ámbar, círculo rojo), para no depender solo del color (WCAG 1.4.1).
 */
export const MarcaSemaforo: React.FC<{ nivel: NivelCarga; titulo?: string }> = ({ nivel, titulo }) => (
  <svg width="9" height="9" viewBox="0 0 9 9" className="shrink-0" role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
    {nivel === 'VACIO' && <circle cx="4.5" cy="4.5" r="3.5" fill="#FFFFFF" stroke={COLOR_SEMAFORO.VACIO} strokeWidth="1.5" />}
    {nivel === 'VERDE' && <rect x="0.5" y="0.5" width="8" height="8" rx="1" fill={COLOR_SEMAFORO.VERDE} />}
    {nivel === 'AMBAR' && <path d="M4.5 0.5L8.6 8H0.4L4.5 0.5Z" fill={COLOR_SEMAFORO.AMBAR} />}
    {nivel === 'ROJO' && <circle cx="4.5" cy="4.5" r="4" fill={COLOR_SEMAFORO.ROJO} />}
  </svg>
);

/**
 * Alerta de stock bajo (LE-078) sobre la esquina del almacén intermedio: insignia oscura con "!",
 * fuera de los colores del semáforo para no confundirse con la ocupación.
 */
export const InsigniaStockBajo: React.FC = () => (
  <g aria-hidden="true">
    <circle r="6" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.5" />
    <path d="M0 -3V0.8" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
    <circle cy="3" r="0.9" fill="#FFFFFF" />
  </g>
);

const OCTAGONO = 'M-2.9 -7L2.9 -7L7 -2.9L7 2.9L2.9 7L-2.9 7L-7 2.9L-7 -2.9Z';
const RADIO_ANILLO = 10;

/**
 * Insignia de avería (D10–D13) centrada en (0, 0): número del tipo sobre una forma propia de cada tipo
 * (1 círculo, 2 rombo, 3 octágono) y con su color. Con `restante` (0–1), un anillo alrededor se vacía a
 * medida que se acerca la reincorporación.
 */
export const InsigniaAveria: React.FC<{ tipo: 1 | 2 | 3; restante?: number }> = ({ tipo, restante }) => {
  const color = COLOR_AVERIA[tipo];
  const perimetro = 2 * Math.PI * RADIO_ANILLO;
  return (
    <g>
      {restante !== undefined && (
        <>
          <circle r={RADIO_ANILLO} fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2.5" filter={SOMBRA} />
          <circle
            r={RADIO_ANILLO}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray={`${perimetro * Math.min(1, Math.max(0, restante))} ${perimetro}`}
            transform="rotate(-90)"
          />
        </>
      )}
      {tipo === 1 && <circle r="6.5" fill={color} />}
      {tipo === 2 && <path d="M0 -7.5L7.5 0L0 7.5L-7.5 0Z" fill={color} />}
      {tipo === 3 && <path d={OCTAGONO} fill={color} />}
      <text y="3.2" textAnchor="middle" fontSize="9" fontWeight="700" fill="#FFFFFF">
        {tipo}
      </text>
    </g>
  );
};

/** Tramo bloqueado: aspa roja sobre fondo claro, centrada en el punto medio del tramo. */
export const MarcaBloqueo: React.FC = () => (
  <>
    <circle r="10" fill="#FEE2E2" />
    <path d="M -6 -6 L 6 6 M -6 6 L 6 -6" stroke="#B91C1C" strokeWidth="2.5" />
  </>
);
