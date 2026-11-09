import React from 'react';
import type { IdAlmacen, TipoUnidad } from '../../config/dominio';
import type { NivelHolgura } from '../../types/pedidos';
import { cn } from '../../lib/clases';
import { COLOR_SEMAFORO } from '../../lib/semaforo';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { AlmacenCentral, AlmacenIntermedio, PinDestino } from '../map/simbolos';
import { iconoVehiculo } from '../map/iconosVehiculo';

import holguraRojo from '../../assets/figma/pedidos/holgura-rojo.svg';
import holguraAmbar from '../../assets/figma/pedidos/holgura-ambar.svg';
import holguraVerde from '../../assets/figma/pedidos/holgura-verde.svg';
import holguraNeutra from '../../assets/figma/pedidos/holgura-neutra.svg';

const PUNTO_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: holguraRojo,
  AMBAR: holguraAmbar,
  VERDE: holguraVerde,
  CERRADO: holguraNeutra,
};

/** Punto de 7 px del semáforo de holgura. */
export const PuntoHolgura: React.FC<{ nivel: NivelHolgura }> = ({ nivel }) => (
  <img src={PUNTO_HOLGURA[nivel]} alt="" className="block shrink-0" />
);

/**
 * Almacén en un minimapa (dentro de un <svg>), con los símbolos del mapa de Operación: el central relleno;
 * el intermedio con la barra y el color del semáforo de su stock (gris si aún no hay dato).
 */
export const SimboloAlmacen: React.FC<{ almacen: IdAlmacen; x: number; y: number; escala?: number; opacidad?: number }> = ({
  almacen,
  x,
  y,
  escala = 1,
  opacidad,
}) => {
  const estado = useDatosOperacion().almacenes.find((a) => a.id === almacen);
  const stock = estado?.porcentajeStock ?? undefined;
  const color = stock === undefined || !estado?.nivelStock ? COLOR_SEMAFORO.VACIO : COLOR_SEMAFORO[estado.nivelStock];
  return (
    <g transform={`translate(${x}, ${y})${escala === 1 ? '' : ` scale(${escala})`}`} opacity={opacidad}>
      {almacen === 'CENTRAL' ? <AlmacenCentral /> : <AlmacenIntermedio color={color} fraccionStock={stock === undefined ? undefined : stock / 100} />}
    </g>
  );
};

/** Unidad en un minimapa (dentro de un <svg>), con el ícono y el color de carga que tiene en el mapa de Operación. */
export const SimboloUnidad: React.FC<{ tipo: TipoUnidad; color: string; hueco?: boolean; x: number; y: number }> = ({
  tipo,
  color,
  hueco = false,
  x,
  y,
}) => {
  const icono = iconoVehiculo(tipo, color, hueco);
  return <image href={icono.href} x={x - icono.centroX} y={y - icono.centroY} width={icono.ancho} height={icono.alto} />;
};

/** Pin de destino en un minimapa (dentro de un <svg>), con la punta sobre (x, y). */
export const SimboloDestino: React.FC<{ color: string; critico?: boolean; x: number; y: number }> = ({ color, critico, x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <PinDestino color={color} critico={critico} />
  </g>
);

/** Rótulo de un minimapa centrado en x, que se desplaza lo necesario para no salirse del ancho del mapa. */
export const RotuloMapa: React.FC<{ x: number; y: number; anchoMapa: number; className?: string; children: React.ReactNode }> = ({
  x,
  y,
  anchoMapa,
  className,
  children,
}) => {
  const MEDIO_ANCHO_ESTIMADO = 40;
  const centro = Math.min(Math.max(x, MEDIO_ANCHO_ESTIMADO + 4), anchoMapa - MEDIO_ANCHO_ESTIMADO - 4);
  return (
    <p
      className={cn('pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-body-sm font-medium', className)}
      style={{ left: centro, top: y }}
    >
      {children}
    </p>
  );
};
