import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/clases';

// Estado vacío o de error de una lista: causa + siguiente paso, con la acción al lado.

interface EstadoVacioProps {
  icono?: LucideIcon;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  accion?: React.ReactNode;
  tono?: 'neutral' | 'critical';
  className?: string;
}

export const EstadoVacio: React.FC<EstadoVacioProps> = ({ icono: Icono, titulo, descripcion, accion, tono = 'neutral', className }) => (
  <div className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
    {Icono && (
      <div
        className={cn(
          'flex size-10 items-center justify-center rounded-full',
          tono === 'critical' ? 'bg-critical-50 text-critical-600' : 'bg-neutral-100 text-neutral-500',
        )}
      >
        <Icono className="size-5" aria-hidden="true" />
      </div>
    )}
    <div className="flex max-w-sm flex-col gap-1">
      <p className={cn('text-title-sm', tono === 'critical' ? 'text-critical-600' : 'text-neutral-900')}>{titulo}</p>
      {descripcion && <p className="text-body-sm text-neutral-600">{descripcion}</p>}
    </div>
    {accion}
  </div>
);
