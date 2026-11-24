import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Hueco de la barra superior para contenido propio de cada pantalla (p. ej. el pulso de la operación).
// La barra monta la ranura; quien quiera mostrar algo allí lo envuelve en <EnBarraSuperior>. Sin ranura
// (pantallas sin barra superior, pruebas) el contenido se muestra en su lugar.

export const ID_RANURA_BARRA_SUPERIOR = 'ranura-barra-superior';

export const RanuraBarraSuperior: React.FC = () => (
  <div id={ID_RANURA_BARRA_SUPERIOR} className="flex-1 min-w-0 flex items-center justify-center px-2" />
);

interface EnBarraSuperiorProps {
  visible?: boolean;
  children: React.ReactNode;
}

export const EnBarraSuperior: React.FC<EnBarraSuperiorProps> = ({ visible = true, children }) => {
  // undefined = todavía no se buscó la ranura; null = no existe.
  const [destino, setDestino] = useState<HTMLElement | null | undefined>(undefined);
  useLayoutEffect(() => {
    // La ranura es un nodo del DOM externo a React: solo existe tras el montaje, por eso se fija aquí.
    // oxlint-disable-next-line react/set-state-in-effect
    setDestino(document.getElementById(ID_RANURA_BARRA_SUPERIOR));
  }, []);

  if (!visible || destino === undefined) return null;
  if (destino) return createPortal(children, destino);
  return <div className="shrink-0 px-2 pt-2">{children}</div>;
};
