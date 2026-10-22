import { useEffect, type RefObject } from 'react';

// Foco de un diálogo modal (WAI-ARIA "dialog modal"): Tab y Shift+Tab recorren solo los controles del
// diálogo, y al cerrarse el foco vuelve al elemento que lo abrió, para que el teclado no se pierda.

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Controles alcanzables con Tab, en orden. De cada grupo de radios cuenta uno solo, como hace el
 * navegador: el marcado o, si ninguno lo está, el primero (entre ellos se avanza con flechas).
 */
function enfocables(contenedor: HTMLElement): HTMLElement[] {
  const todos = [...contenedor.querySelectorAll<HTMLElement>(ENFOCABLES)];
  const esRadio = (el: HTMLElement): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === 'radio';
  const vistos = new Set<string>();
  return todos.filter((el) => {
    if (!esRadio(el)) return true;
    const marcado = todos.find((otro) => esRadio(otro) && otro.name === el.name && otro.checked);
    if (marcado) return el === marcado;
    if (vistos.has(el.name)) return false;
    vistos.add(el.name);
    return true;
  });
}

export function useFocoAtrapado(contenedor: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Tab' || !contenedor.current) return;
      const lista = enfocables(contenedor.current);
      if (lista.length === 0) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const dentro = contenedor.current.contains(document.activeElement);
      if (evento.shiftKey && (document.activeElement === primero || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !dentro)) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      // Si el elemento que lo abrió ya no existe (p. ej. el panel cambió de vista), no hay a dónde volver.
      if (previo && previo.isConnected) previo.focus();
    };
  }, [contenedor]);
}
