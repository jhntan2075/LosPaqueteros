import React from 'react';
import { ALMACENES } from '../../config/dominio';
import { MARCA_ESTADO_FRACCION, NOMBRE_ESTADO_FRACCION } from '../../config/glosario';
import { minutosEntre } from '../../lib/envios';
import { formatearDuracion, formatearHora } from '../../lib/formato';
import type { Coordenada } from '../../types/domain';
import type { EstadoFraccion, Fraccion } from '../../types/operacion';

// Fila de una fracción de pedido (la parte que lleva una unidad), compartida por el detalle del almacén
// (en camino / por salir / entregados), la lista de pedidos y el detalle del pedido.

/** Qué hora destaca la segunda línea: la salida (por salir), la llegada (en camino) o la entrega. */
export type ContextoFraccion = 'salida' | 'llegada' | 'entrega' | 'ruta';

const COLOR_ESTADO: Record<EstadoFraccion, string> = {
  PROGRAMADA: 'text-[#0F172A]',
  EN_CAMINO: 'text-[#1E40AF]',
  ENTREGADA: 'text-[#15803D]',
  LIBERADA: 'text-[#64748B]',
};

const nombreAlmacen = (id: Fraccion['origen']) => ALMACENES.find((a) => a.id === id)?.nombre ?? id;

/** "en 35 min" / "hace 2 h 10 min" respecto del reloj simulado. */
const relativo = (fecha: Date, ahora: Date) => {
  const minutos = minutosEntre(ahora, fecha);
  return minutos >= 0 ? `en ${formatearDuracion(minutos)}` : `hace ${formatearDuracion(-minutos)}`;
};

function segundaLinea(f: Fraccion, contexto: ContextoFraccion, ahora: Date, destino?: Coordenada): string {
  const hacia = destino ? ` → (${destino.x},${destino.y})` : '';
  if (contexto === 'salida') return `sale ${formatearHora(f.salida)} · ${relativo(f.salida, ahora)}${hacia}`;
  if (contexto === 'llegada') return `llega ${formatearHora(f.llegada)} · ${relativo(f.llegada, ahora)}${hacia}`;
  if (contexto === 'entrega') return `entregada ${formatearHora(f.llegada)} · ${relativo(f.llegada, ahora)}${hacia}`;
  const llegada = f.estado === 'ENTREGADA' ? `entregada ${formatearHora(f.llegada)}` : `llega ${formatearHora(f.llegada)}`;
  return `${nombreAlmacen(f.origen)} → ${f.unidad} · sale ${formatearHora(f.salida)} · ${llegada}`;
}

interface FilaFraccionProps {
  fraccion: Fraccion;
  /** Fracciones del pedido: con una sola se muestra el código del pedido, sin numerar. */
  total: number;
  contexto: ContextoFraccion;
  ahora: Date;
  destino?: Coordenada;
  resaltada?: boolean;
  onElegir: (fraccion: Fraccion) => void;
}

export const FilaFraccion: React.FC<FilaFraccionProps> = ({ fraccion: f, total, contexto, ahora, destino, resaltada = false, onElegir }) => (
  <li data-fraccion={f.codigo} aria-current={resaltada ? 'true' : undefined}>
    <button
      type="button"
      onClick={() => onElegir(f)}
      className={`w-full py-[4px] -mx-[4px] px-[4px] rounded flex flex-col gap-[1px] text-left text-[12px] ${
        resaltada ? 'bg-[#EFF6FF] ring-1 ring-[#1E40AF]' : 'hover:bg-[#F8FAFC]'
      }`}
    >
      <span className="flex items-center gap-[6px] w-full">
        <span aria-hidden="true" className={`w-[12px] text-center ${COLOR_ESTADO[f.estado]}`}>
          {MARCA_ESTADO_FRACCION[f.estado]}
        </span>
        <span className="tabular-nums font-semibold text-[#0F172A]">{total > 1 ? f.codigo : f.pedido}</span>
        <span className="tabular-nums text-[#64748B] truncate">
          · {f.cantidad} paq. · {f.unidad}
        </span>
        <span className={`ml-auto whitespace-nowrap ${COLOR_ESTADO[f.estado]}`}>{NOMBRE_ESTADO_FRACCION[f.estado]}</span>
      </span>
      <span className="pl-[18px] text-[11px] text-[#64748B] tabular-nums truncate">{segundaLinea(f, contexto, ahora, destino)}</span>
    </button>
  </li>
);
