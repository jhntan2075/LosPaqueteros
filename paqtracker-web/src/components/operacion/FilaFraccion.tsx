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
  PROGRAMADA: 'text-neutral-900',
  EN_CAMINO: 'text-primary-600',
  ENTREGADA: 'text-ok-700',
  LIBERADA: 'text-neutral-600',
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
  /** Sin valor, la fila es de solo lectura. */
  onElegir?: (fraccion: Fraccion) => void;
}

export const FilaFraccion: React.FC<FilaFraccionProps> = ({ fraccion: f, total, contexto, ahora, destino, resaltada = false, onElegir }) => {
  const contenido = (
    <>
      <span className="flex items-center gap-1.5 w-full">
        <span aria-hidden="true" className={`w-3.5 text-center ${COLOR_ESTADO[f.estado]}`}>
          {MARCA_ESTADO_FRACCION[f.estado]}
        </span>
        <span className="tabular-nums font-semibold text-neutral-900">{total > 1 ? f.codigo : f.pedido}</span>
        <span className="tabular-nums text-neutral-600 truncate">
          · {f.cantidad} paq. · {f.unidad}
        </span>
        <span className={`ml-auto whitespace-nowrap ${COLOR_ESTADO[f.estado]}`}>{NOMBRE_ESTADO_FRACCION[f.estado]}</span>
      </span>
      <span className="pl-5 text-caption text-neutral-600 tabular-nums truncate">{segundaLinea(f, contexto, ahora, destino)}</span>
    </>
  );
  const base = 'w-full py-1 -mx-1 px-1 rounded flex flex-col gap-px text-left text-body-sm';
  return (
    <li data-fraccion={f.codigo} aria-current={resaltada ? 'true' : undefined}>
      {onElegir ? (
        <button
          type="button"
          onClick={() => onElegir(f)}
          className={`${base} ${resaltada ? 'bg-primary-50 ring-1 ring-primary-600' : 'hover:bg-neutral-50'}`}
        >
          {contenido}
        </button>
      ) : (
        // Solo lectura (detalle de Pedidos): sin acción, no se presenta como botón.
        <div className={base}>{contenido}</div>
      )}
    </li>
  );
};
