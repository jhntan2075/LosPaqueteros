import React from 'react';
import { cn } from '../../lib/clases';
import { FONDO_TONO, PUNTO_TONO, TEXTO_TONO, type Tono } from './tonos';

// Insignia de estado: siempre texto (el color nunca es la única señal) y, opcionalmente, un punto.

interface InsigniaProps {
  tono?: Tono;
  /** Punto de color antes del texto; `pulso` lo anima (estado en curso). */
  punto?: boolean | 'pulso';
  /** `md` para el estado principal de un encabezado; `sm` en tablas y listas. */
  tamano?: 'sm' | 'md';
  /** Contorno en vez de relleno: para un estado terminal que debe destacar (colapso). */
  contorno?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export const Insignia: React.FC<InsigniaProps> = ({
  tono = 'neutral',
  punto = false,
  tamano = 'sm',
  contorno = false,
  title,
  className,
  children,
}) => (
  <span
    title={title}
    className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
      tamano === 'sm' ? 'px-2 py-0.5 text-caption' : 'px-2.5 py-1 text-body-sm font-semibold',
      contorno ? cn('border border-current bg-white', TEXTO_TONO[tono]) : FONDO_TONO[tono],
      className,
    )}
  >
    {punto && (
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', PUNTO_TONO[tono], punto === 'pulso' && 'motion-safe:animate-pulse')}
      />
    )}
    {children}
  </span>
);
