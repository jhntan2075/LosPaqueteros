import { useEffect, useState } from 'react';

// ¿La pantalla es angosta (celular)? Mismo corte que `md` de Tailwind: menos de 768 px.
// Sin matchMedia (pruebas en jsdom) se asume pantalla ancha.

const CONSULTA_ANGOSTO = '(max-width: 767px)';

const hayMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

export function useAnchoAngosto(): boolean {
  const [angosto, setAngosto] = useState<boolean>(() => hayMatchMedia() && window.matchMedia(CONSULTA_ANGOSTO).matches);

  useEffect(() => {
    if (!hayMatchMedia()) return;
    const consulta = window.matchMedia(CONSULTA_ANGOSTO);
    const alCambiar = () => setAngosto(consulta.matches);
    alCambiar();
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  return angosto;
}
