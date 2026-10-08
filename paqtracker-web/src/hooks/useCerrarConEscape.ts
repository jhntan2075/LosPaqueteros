import { useEffect } from 'react';

/**
 * Cierra un modal al presionar Escape mientras está abierto.
 */
export function useCerrarConEscape(abierto: boolean, onCerrar: () => void) {
  useEffect(() => {
    if (!abierto) return;

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar();
    };

    window.addEventListener('keydown', alPresionarTecla);
    return () => window.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, onCerrar]);
}
