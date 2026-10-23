import React from 'react';
import { cn } from '../../lib/clases';

// Etiqueta de estado (EN CURSO, Planificado, Averiada…). El texto siempre acompaña al color, y cada tono
// usa la combinación que pasa AA (ver docs/design-system.md): nunca naranja como texto, verde oscuro
// sobre verde suave.

export type TonoEtiqueta = 'neutro' | 'primario' | 'info' | 'ok' | 'atencion' | 'critico';

const TONO: Record<TonoEtiqueta, { fondo: string; punto: string }> = {
  neutro: { fondo: 'bg-neutral-100 text-neutral-600', punto: 'bg-neutral-500' },
  primario: { fondo: 'bg-primary-100 text-primary-600', punto: 'bg-primary-600' },
  info: { fondo: 'bg-info-50 text-info-700', punto: 'bg-info-600' },
  ok: { fondo: 'bg-ok-50 text-ok-700', punto: 'bg-ok-600' },
  atencion: { fondo: 'bg-warn-50 text-warn-700', punto: 'bg-warn-500' },
  critico: { fondo: 'bg-critical-50 text-critical-600', punto: 'bg-critical-600' },
};

export const Etiqueta: React.FC<{
  tono: TonoEtiqueta;
  /** Punto de color delante del texto; `pulso` para lo que está ocurriendo ahora. */
  punto?: boolean | 'pulso';
  className?: string;
  children: React.ReactNode;
}> = ({ tono, punto = false, className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-[6px] rounded-[4px] px-[8px] py-[3px] text-body font-medium whitespace-nowrap',
      TONO[tono].fondo,
      className,
    )}
  >
    {punto && <span aria-hidden="true" className={cn('size-[6px] rounded-full', TONO[tono].punto, punto === 'pulso' && 'animate-pulse')} />}
    {children}
  </span>
);
