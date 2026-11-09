import { useEffect, useState } from 'react';

// Tema de la interfaz (docs/design-system.md, "Tema oscuro"): claro, oscuro o automático (el del sistema
// operativo). La elección se guarda en el navegador. El script de index.html aplica el tema guardado
// antes de dibujar la página, para que no destelle en blanco: usa la misma clave.

export type PreferenciaTema = 'claro' | 'oscuro' | 'automatico';

export const CLAVE_TEMA = 'paqtracker.tema';
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

export function leerPreferencia(): PreferenciaTema {
  try {
    const guardada = localStorage.getItem(CLAVE_TEMA);
    if (guardada === 'claro' || guardada === 'oscuro' || guardada === 'automatico') return guardada;
  } catch {
    // Almacenamiento bloqueado (ventana privada, permisos): se usa el automático.
  }
  return 'automatico';
}

const sistemaOscuro = () => typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA_OSCURO).matches;

/** ¿La preferencia resulta en tema oscuro ahora? */
export const resuelveOscuro = (preferencia: PreferenciaTema) =>
  preferencia === 'oscuro' || (preferencia === 'automatico' && sistemaOscuro());

export const aplicarTema = (preferencia: PreferenciaTema) =>
  document.documentElement.classList.toggle('oscuro', resuelveOscuro(preferencia));

/** Preferencia vigente y cómo cambiarla. En automático sigue al sistema también con la aplicación abierta. */
export function useTema(): [PreferenciaTema, (preferencia: PreferenciaTema) => void] {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(leerPreferencia);

  useEffect(() => {
    aplicarTema(preferencia);
    try {
      localStorage.setItem(CLAVE_TEMA, preferencia);
    } catch {
      // Sin almacenamiento la elección dura solo esta sesión.
    }
    if (preferencia !== 'automatico' || typeof window.matchMedia !== 'function') return;
    const consulta = window.matchMedia(CONSULTA_OSCURO);
    const alCambiar = () => aplicarTema('automatico');
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, [preferencia]);

  return [preferencia, setPreferencia];
}
