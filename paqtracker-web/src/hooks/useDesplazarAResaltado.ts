import { useEffect, type RefObject } from 'react';

const prefiereMenosMovimiento = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lleva a la vista la fila resaltada de una lista (F01, F05) cuando cambia lo resaltado, no con cada
 * instantánea: la lista no salta mientras el usuario la recorre. `selector` identifica la fila, p. ej.
 * `[data-unidad="A-01"]`; null no desplaza.
 */
export function useDesplazarAResaltado(contenedor: RefObject<HTMLElement | null>, selector: string | null) {
  useEffect(() => {
    if (!selector) return;
    const fila = contenedor.current?.querySelector(selector);
    // jsdom no implementa scrollIntoView.
    fila?.scrollIntoView?.({ block: 'nearest', behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' });
  }, [contenedor, selector]);
}
