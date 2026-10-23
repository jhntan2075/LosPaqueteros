import React, { forwardRef } from 'react';
import { cn } from '../../lib/clases';

// Campo de texto, número o fecha. El placeholder va en neutral-500 (5.07 sobre blanco, pasa AA) y sigue
// distinguiéndose del valor, que va en neutral-900.

export const CLASE_CAMPO =
  'h-[34px] px-[10px] rounded-[6px] border border-neutral-300 bg-white text-body-lg text-neutral-900 tabular-nums outline-none transition placeholder:text-neutral-500 focus:border-primary-600 focus:ring-1 focus:ring-primary-600/30 disabled:bg-neutral-50 disabled:text-neutral-500';

export const Campo = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Campo(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(CLASE_CAMPO, className)} {...props} />;
});
