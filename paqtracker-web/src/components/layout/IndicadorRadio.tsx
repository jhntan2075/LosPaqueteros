import React from 'react';

/**
 * Círculo de radio para las tarjetas de opción única (plazo, escenario, tipo de avería): deja claro que
 * se elige una sola, sin depender solo del borde. Es decorativo; el radio nativo va oculto en la tarjeta.
 */
export const IndicadorRadio: React.FC<{ marcado: boolean }> = ({ marcado }) => (
  <span
    aria-hidden="true"
    className={`size-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${
      marcado ? 'border-primary-600' : 'border-neutral-400 bg-superficie'
    }`}
  >
    {marcado && <span className="size-1.5 rounded-full bg-primary-600" />}
  </span>
);
