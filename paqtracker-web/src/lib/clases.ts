import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge no conoce los tokens propios de tailwind.config.js: sin esto confundiría `text-body`
// (tamaño) con un color y lo descartaría al combinarlo con `text-neutral-600`.
const combinar = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'overline', 'body-sm', 'body', 'title-sm', 'title', 'kpi'] }],
      rounded: [{ rounded: ['control', 'card'] }],
      shadow: [{ shadow: ['2xs', 'xs', 'overlay'] }],
    },
  },
});

/** Une clases condicionales y resuelve conflictos de Tailwind (la última gana). */
export const cn = (...clases: ClassValue[]) => combinar(clsx(clases));
