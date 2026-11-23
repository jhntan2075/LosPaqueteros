import { useEffect } from 'react';

/**
 * Cierre de un popover o desplegable que flota sobre el mapa mientras está abierto: Escape lo cierra (quien lo
 * monta devuelve el foco a su botón) y tocar fuera también (sin mover el foco). `esPropio` dice si un toque
 * cae dentro del desplegable o de su botón. Un diálogo modal encima (rangos del semáforo) cuenta como
 * "dentro": ni su Escape ni sus toques cierran el desplegable que lo abrió.
 */
export function useCierreDePopover(abierto: boolean, esPropio: (destino: Element) => boolean, alCerrar: (motivo: 'escape' | 'fuera') => void) {
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      alCerrar('escape');
    };
    const alTocar = (evento: PointerEvent) => {
      const destino = evento.target as Element | null;
      if (!destino || esPropio(destino) || destino.closest?.('[aria-modal="true"]')) return;
      alCerrar('fuera');
    };
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('pointerdown', alTocar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('pointerdown', alTocar);
    };
  }, [abierto, esPropio, alCerrar]);
}
