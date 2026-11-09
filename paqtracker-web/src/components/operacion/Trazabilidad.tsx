import React from 'react';
import { cn } from '../../lib/clases';
import type { HitoTrazabilidad } from '../../types/operacion';
import { TituloSeccion } from './comunes';

// Línea de tiempo de un pedido: la misma en el panel de Operación y en el detalle de Pedidos.

interface TrazabilidadProps {
  hitos: HitoTrazabilidad[];
  /** Texto cuando aún no hay hitos. */
  textoVacio?: string;
  className?: string;
}

export const Trazabilidad: React.FC<TrazabilidadProps> = ({ hitos, textoVacio = 'Sin hitos registrados.', className }) => {
  const reasignaciones = hitos.filter((h) => h.titulo.startsWith('Reasignación')).length;
  return (
    <section className={cn('px-3 pt-2.5 pb-1.5 flex flex-col gap-2', className)}>
      <TituloSeccion derecha={reasignaciones > 0 ? `${reasignaciones} reasignación${reasignaciones > 1 ? 'es' : ''}` : undefined}>Trazabilidad</TituloSeccion>
      {/* En orden cronológico: de arriba hacia abajo se lee cómo ocurrió; el último hito se resalta. */}
      <ol className="flex flex-col">
        {hitos.length === 0 && <li className="font-sans text-body-sm text-neutral-600">{textoVacio}</li>}
        {hitos.map((hito, i) => (
          <li key={`${hito.titulo}-${i}`} className="flex gap-2.5 text-body-sm">
            <time className="w-20 tabular-nums text-neutral-600 whitespace-nowrap shrink-0">{hito.hora}</time>
            <span className="relative flex flex-col items-center shrink-0" aria-hidden="true">
              <span className={`mt-1 size-2 rounded-full ${hito.reciente ? 'bg-[#1E40AF]' : 'bg-neutral-400'}`} />
              {i < hitos.length - 1 && <span className="w-px flex-1 bg-neutral-300" />}
            </span>
            <span className="flex flex-col min-w-0 pb-2.5">
              <span className="font-sans font-semibold text-neutral-900">{hito.titulo}</span>
              <span className="font-sans text-neutral-600">{hito.detalle}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};
