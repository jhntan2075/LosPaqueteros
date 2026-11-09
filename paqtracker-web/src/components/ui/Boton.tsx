import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/clases';

// Botón único de la interfaz (docs/propuesta-unificacion-ui.md §2.5). Un `primario` por vista; lo
// destructivo usa `peligro` y pasa por DialogoConfirmacion.

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'peligro-secundario';
export type TamanoBoton = 'sm' | 'md' | 'lg';

export interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  /** Ícono a la izquierda del texto (o solo, si el botón no tiene texto: entonces exige `aria-label`). */
  icono?: LucideIcon;
  iconoDerecha?: LucideIcon;
  /** Deshabilita el botón y muestra `textoCargando` en lugar del contenido. */
  cargando?: boolean;
  textoCargando?: React.ReactNode;
}

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-primary-600 text-sobre-color font-semibold shadow-xs hover:bg-primary-700 disabled:hover:bg-primary-600',
  secundario:
    'bg-superficie border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 hover:text-neutral-900 disabled:hover:bg-superficie',
  fantasma: 'text-neutral-700 font-medium hover:bg-neutral-100 hover:text-neutral-900 disabled:hover:bg-transparent',
  peligro: 'bg-critical-600 text-sobre-color font-semibold hover:bg-critical-700 disabled:hover:bg-critical-600',
  'peligro-secundario':
    'bg-superficie border border-critical-600/40 text-critical-600 font-medium hover:bg-critical-50 disabled:hover:bg-superficie',
};

const TAMANOS: Record<TamanoBoton, { conTexto: string; soloIcono: string; icono: string }> = {
  sm: { conTexto: 'h-7 px-2.5 text-body-sm', soloIcono: 'size-7', icono: 'size-3.5' },
  md: { conTexto: 'h-8 px-3 text-body', soloIcono: 'size-8', icono: 'size-3.5' },
  lg: { conTexto: 'h-10 px-4 text-body', soloIcono: 'size-10', icono: 'size-4' },
};

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(
  (
    {
      variante = 'secundario',
      tamano = 'md',
      icono: Icono,
      iconoDerecha: IconoDerecha,
      cargando = false,
      textoCargando,
      type = 'button',
      disabled,
      className,
      children,
      ...resto
    },
    ref,
  ) => {
    const medidas = TAMANOS[tamano];
    const soloIcono = children === undefined || children === null || children === false;
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || cargando}
        aria-busy={cargando || undefined}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
          soloIcono ? medidas.soloIcono : medidas.conTexto,
          VARIANTES[variante],
          className,
        )}
        {...resto}
      >
        {Icono && <Icono className={cn(medidas.icono, 'shrink-0')} aria-hidden="true" />}
        {cargando && textoCargando ? textoCargando : children}
        {IconoDerecha && <IconoDerecha className={cn(medidas.icono, 'shrink-0')} aria-hidden="true" />}
      </button>
    );
  },
);
Boton.displayName = 'Boton';
