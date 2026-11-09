import React, { forwardRef } from 'react';
import { cn } from '../../lib/clases';

// Campo de formulario: etiqueta + control + ayuda + error. El control recibe `aria-describedby` y
// `aria-invalid` automáticamente, para que el lector de pantalla lea la ayuda y el error.

interface CampoProps {
  /** id del control: une la etiqueta con él. */
  htmlFor: string;
  etiqueta: React.ReactNode;
  ayuda?: React.ReactNode;
  error?: React.ReactNode;
  obligatorio?: boolean;
  className?: string;
  children: React.ReactElement;
}

export const Campo: React.FC<CampoProps> = ({ htmlFor, etiqueta, ayuda, error, obligatorio = false, className, children }) => {
  const idAyuda = ayuda ? `${htmlFor}-ayuda` : undefined;
  const idError = error ? `${htmlFor}-error` : undefined;
  // Con error, la ayuda no se muestra: el control solo apunta al mensaje que está en pantalla.
  const describedBy = idError ?? idAyuda;
  // Se suma a lo que el control ya trae (por ejemplo, un `aria-invalid` que el formulario marca sin mensaje
  // propio en este campo), sin pisarlo.
  const propio = React.isValidElement<Record<string, unknown>>(children) ? children.props : {};
  const describedByFinal = [propio['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined;
  const control = React.isValidElement<Record<string, unknown>>(children)
    ? React.cloneElement(children, {
        'aria-describedby': describedByFinal,
        'aria-invalid': error ? true : propio['aria-invalid'],
      })
    : children;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-body-sm font-medium text-neutral-700">
        {etiqueta}
        {obligatorio && (
          <span className="text-critical-600" aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      {control}
      {error ? (
        <span id={idError} className="text-caption text-critical-600">
          {error}
        </span>
      ) : (
        ayuda && (
          <span id={idAyuda} className="text-caption text-neutral-600">
            {ayuda}
          </span>
        )
      )}
    </div>
  );
};

type TamanoControl = 'md' | 'lg';

const CONTROL_BASE =
  'w-full min-w-0 rounded-control border border-neutral-300 bg-white text-body text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 aria-[invalid=true]:border-critical-600 aria-[invalid=true]:focus:ring-critical-600/20';
const ALTURA: Record<TamanoControl, string> = { md: 'h-8 px-2.5', lg: 'h-10 px-3' };

export interface EntradaProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  tamano?: TamanoControl;
}

/** Input de texto, número, fecha u hora con el estilo único de la interfaz. */
export const Entrada = forwardRef<HTMLInputElement, EntradaProps>(({ tamano = 'md', className, ...resto }, ref) => (
  <input ref={ref} className={cn(CONTROL_BASE, ALTURA[tamano], className)} {...resto} />
));
Entrada.displayName = 'Entrada';

export interface SelectorProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  tamano?: TamanoControl;
}

export const Selector = forwardRef<HTMLSelectElement, SelectorProps>(({ tamano = 'md', className, ...resto }, ref) => (
  <select ref={ref} className={cn(CONTROL_BASE, ALTURA[tamano], 'cursor-pointer', className)} {...resto} />
));
Selector.displayName = 'Selector';
