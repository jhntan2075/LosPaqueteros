import React from 'react';

/**
 * Círculo de radio para las tarjetas de opción única (plazo, escenario, tipo de avería): deja claro que
 * se elige una sola, sin depender solo del borde. Es decorativo; el radio nativo va oculto en la tarjeta.
 */
export const IndicadorRadio: React.FC<{ marcado: boolean }> = ({ marcado }) => (
  <span
    aria-hidden="true"
    className={`size-[14px] shrink-0 rounded-full border-2 flex items-center justify-center ${
      marcado ? 'border-[#1E40AF]' : 'border-[#94A3B8] bg-white'
    }`}
  >
    {marcado && <span className="size-[6px] rounded-full bg-[#1E40AF]" />}
  </span>
);
