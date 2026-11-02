import { useCallback, useEffect, useState } from 'react';

// Sincroniza un parámetro de la URL (?nombre=valor) con el estado de React: se lee al montar y en
// cada navegación con atrás/adelante del navegador, y se escribe de vuelta al cambiarlo. Así la
// pestaña, el panel abierto o la simulación en pantalla se pueden recargar, compartir o deshacer con
// el botón atrás. Sin router: son pocas rutas (4 pestañas y un par de subestados) y la query string
// no exige tocar la configuración de Nginx, a diferencia de una ruta por path.

const leer = (nombre: string) => new URLSearchParams(window.location.search).get(nombre);

export interface OpcionesFijarParametro {
  /** Crea una entrada nueva en el historial (atrás la deshace); por defecto reemplaza la actual. */
  empujar?: boolean;
}

/** Valor crudo de un parámetro de la URL, y la función para cambiarlo. `null` lo quita de la URL. */
export function useParametroUrl(nombre: string): [string | null, (valor: string | null, opciones?: OpcionesFijarParametro) => void] {
  const [valor, setValorInterno] = useState<string | null>(() => leer(nombre));

  useEffect(() => {
    const alNavegar = () => setValorInterno(leer(nombre));
    window.addEventListener('popstate', alNavegar);
    return () => window.removeEventListener('popstate', alNavegar);
  }, [nombre]);

  const fijar = useCallback(
    (nuevo: string | null, opciones: OpcionesFijarParametro = {}) => {
      setValorInterno(nuevo);
      const url = new URL(window.location.href);
      if (nuevo === null) url.searchParams.delete(nombre);
      else url.searchParams.set(nombre, nuevo);
      window.history[opciones.empujar ? 'pushState' : 'replaceState'](null, '', url);
    },
    [nombre],
  );

  return [valor, fijar];
}

/**
 * Como `useParametroUrl`, pero acotado a un conjunto cerrado de valores con uno por defecto: un valor
 * fuera del conjunto (URL manipulada a mano, o versión vieja de la app) cae al valor por defecto en
 * vez de romper la pantalla. El valor por defecto nunca se escribe en la URL.
 */
export function useParametroUrlCerrado<T extends string>(
  nombre: string,
  valoresValidos: readonly T[],
  porDefecto: T,
): [T, (valor: T, opciones?: OpcionesFijarParametro) => void] {
  const [crudo, fijarCrudo] = useParametroUrl(nombre);
  const valor = crudo !== null && (valoresValidos as readonly string[]).includes(crudo) ? (crudo as T) : porDefecto;
  const fijar = useCallback(
    (nuevo: T, opciones?: OpcionesFijarParametro) => fijarCrudo(nuevo === porDefecto ? null : nuevo, opciones),
    [fijarCrudo, porDefecto],
  );
  return [valor, fijar];
}
