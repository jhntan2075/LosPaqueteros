import React, { useRef } from 'react';
import { cn } from '../../lib/clases';

// Pestañas WAI-ARIA (tablist/tab) con flechas izquierda/derecha. `subrayado` navega entre contenidos
// de una misma vista; `segmentado` cambia de modo (por ejemplo, abrir o crear).

export interface OpcionPestana<T extends string> {
  id: T;
  etiqueta: React.ReactNode;
  /** id del panel que controla la pestaña (aria-controls). */
  panel?: string;
}

interface PestanasProps<T extends string> {
  opciones: OpcionPestana<T>[];
  activa: T;
  onCambiar: (id: T) => void;
  etiqueta: string;
  variante?: 'subrayado' | 'segmentado';
  className?: string;
}

export function Pestanas<T extends string>({ opciones, activa, onCambiar, etiqueta, variante = 'subrayado', className }: PestanasProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const alTeclear = (e: React.KeyboardEvent, indice: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const siguiente = (indice + (e.key === 'ArrowRight' ? 1 : -1) + opciones.length) % opciones.length;
    onCambiar(opciones[siguiente].id);
    refs.current[siguiente]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className={cn(
        variante === 'subrayado' ? 'flex items-end gap-5 border-b border-neutral-200' : 'inline-flex gap-1 rounded-control bg-neutral-100 p-0.5',
        className,
      )}
    >
      {opciones.map((o, i) => {
        const seleccionada = o.id === activa;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={seleccionada}
            aria-controls={o.panel}
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onCambiar(o.id)}
            onKeyDown={(e) => alTeclear(e, i)}
            className={cn(
              'whitespace-nowrap text-body font-medium transition-colors cursor-pointer',
              variante === 'subrayado'
                ? cn(
                    '-mb-px h-10 border-b-2 px-0.5',
                    seleccionada ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-600 hover:text-neutral-900',
                  )
                : cn(
                    'h-7 rounded px-3',
                    seleccionada ? 'bg-superficie text-primary-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900',
                  ),
            )}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
