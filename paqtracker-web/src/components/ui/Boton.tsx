import React, { forwardRef } from 'react';
import { cn } from '../../lib/clases';

// Botón de acción del sistema. Tres variantes por intención y tres tamaños; los enlaces de texto
// ("Centrar en el mapa", "Ver todos los eventos") no son botones de acción y no lo usan.

type Variante = 'primario' | 'secundario' | 'peligro';
type Tamano = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-[6px] rounded-[6px] font-medium whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTE: Record<Variante, string> = {
  primario: 'bg-primary-600 text-white hover:bg-primary-700 disabled:hover:bg-primary-600',
  secundario: 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 disabled:hover:bg-white',
  peligro: 'bg-critical-600 text-white hover:bg-critical-600/90 disabled:hover:bg-critical-600',
};

const TAMANO: Record<Tamano, string> = {
  sm: 'h-[30px] px-[12px] text-body',
  md: 'h-[34px] px-[14px] text-body-lg',
  lg: 'h-[40px] px-[18px] text-body-lg',
};

export interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
}

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { variante = 'secundario', tamano = 'md', type = 'button', className, ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(BASE, VARIANTE[variante], TAMANO[tamano], className)} {...props} />;
});
