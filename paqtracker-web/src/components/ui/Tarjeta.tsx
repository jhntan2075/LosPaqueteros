import React from 'react';
import { cn } from '../../lib/clases';

// Superficie de contenido: borde suave, radio de 10 px y fondo blanco. `elevada` para lo que flota sobre
// el mapa (paneles, leyenda, menús).

export const Tarjeta: React.FC<React.HTMLAttributes<HTMLElement> & { elevada?: boolean; como?: 'div' | 'section' | 'aside' }> = ({
  elevada = false,
  como: Elemento = 'div',
  className,
  ...props
}) => (
  <Elemento
    className={cn(
      'rounded-[10px] border border-neutral-200 bg-white',
      elevada && 'shadow-[0px_2px_12px_0px_rgba(0,0,0,0.16)]',
      className,
    )}
    {...props}
  />
);
