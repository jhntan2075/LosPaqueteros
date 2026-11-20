import React from 'react';
import { cn } from '../../lib/clases';

// Estado de carga de una lista o pantalla: texto anunciado + barras de esqueleto con la forma del contenido.

interface EstadoCargaProps {
  texto: string;
  /** Cantidad de barras de esqueleto (3 por defecto). */
  filas?: number;
  className?: string;
}

export const EstadoCarga: React.FC<EstadoCargaProps> = ({ texto, filas = 3, className }) => (
  <div role="status" aria-live="polite" className={cn('flex w-full max-w-md flex-col gap-3 px-6 py-8', className)}>
    <p className="text-body text-neutral-600">{texto}</p>
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: filas }, (_, i) => (
        <div
          key={i}
          data-esqueleto
          className={cn('h-4 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none', i === filas - 1 && filas > 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  </div>
);
