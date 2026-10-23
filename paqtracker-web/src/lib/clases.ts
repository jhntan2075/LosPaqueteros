import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Combina clases de Tailwind: la última gana ante un conflicto (p. ej. `h-[34px]` y `h-10`). Conoce la
// escala tipográfica propia, para no confundir `text-body` con un color y descartar el color del texto.
const combinar = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'body', 'body-lg', 'title', 'display'] }],
    },
  },
});

export const cn = (...clases: ClassValue[]) => combinar(clsx(clases));
