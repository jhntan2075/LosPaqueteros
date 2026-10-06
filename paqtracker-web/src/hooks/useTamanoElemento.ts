import { useEffect, useState, type RefObject } from 'react';

/** Ancho y alto actuales de un elemento; se actualizan con ResizeObserver, no solo al redimensionar la ventana. */
export function useTamanoElemento(ref: RefObject<HTMLElement | null>) {
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setTamano((previo) => (previo.ancho === width && previo.alto === height ? previo : { ancho: width, alto: height }));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);

  return tamano;
}
