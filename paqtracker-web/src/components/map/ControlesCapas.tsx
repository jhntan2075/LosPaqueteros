import React from 'react';
import {
  AYUDA_COLOR_CARGA,
  AYUDA_COLOR_HOLGURA,
  CAPAS_VISIBLES,
  COLOR_DE_LAS_UNIDADES,
  HERRAMIENTA_CAPAS,
  MODO_COLOR_CARGA,
  MODO_COLOR_HOLGURA,
  NOMBRE_CAPA,
} from '../../config/glosario';
import { CAPAS, type Capa, type ModoColor } from './capas';

// Contenido del popover "Capas": qué se dibuja en el mapa y qué codifica el color de las unidades.

interface SelectorCapasProps {
  capas: Record<Capa, boolean>;
  onCambiarCapa: (capa: Capa) => void;
}

export const SelectorCapas: React.FC<SelectorCapasProps> = ({ capas, onCambiarCapa }) => (
  <fieldset className="flex flex-col cursor-default">
    <legend className="sr-only">{CAPAS_VISIBLES}</legend>
    <span aria-hidden="true" className="block text-overline uppercase text-neutral-600 mb-1">
      {HERRAMIENTA_CAPAS}
    </span>
    {CAPAS.map((clave) => (
      <label key={clave} className="flex items-center gap-2.5 min-h-11 text-body-sm font-sans text-neutral-900 cursor-pointer">
        <input type="checkbox" checked={capas[clave]} onChange={() => onCambiarCapa(clave)} className="size-4 accent-primary-600" />
        {NOMBRE_CAPA[clave]}
      </label>
    ))}
  </fieldset>
);

const MODOS: [ModoColor, string][] = [
  ['carga', MODO_COLOR_CARGA],
  ['holgura', MODO_COLOR_HOLGURA],
];

interface SelectorColorProps {
  modoColor: ModoColor;
  onCambiarModoColor: (modo: ModoColor) => void;
}

export const SelectorColorUnidades: React.FC<SelectorColorProps> = ({ modoColor, onCambiarModoColor }) => (
  <div className="cursor-default">
    <span className="block text-overline uppercase text-neutral-600 mb-1.5">{COLOR_DE_LAS_UNIDADES}</span>
    <div role="radiogroup" aria-label={COLOR_DE_LAS_UNIDADES} className="grid grid-cols-2 p-0.5 bg-neutral-100 rounded-control mb-2">
      {MODOS.map(([valor, etiqueta]) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={modoColor === valor}
          onClick={() => onCambiarModoColor(valor)}
          className={`h-11 rounded-control text-body-sm transition ${
            modoColor === valor ? 'bg-superficie shadow-xs font-medium text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
    <p className="text-caption text-neutral-600">
      {modoColor === 'carga' ? AYUDA_COLOR_CARGA : AYUDA_COLOR_HOLGURA}
    </p>
  </div>
);
