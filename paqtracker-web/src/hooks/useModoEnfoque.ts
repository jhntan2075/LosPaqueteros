import { useState } from 'react';

/**
 * Modo enfoque del mapa: deja solo el mapa y sus herramientas. Al activarlo se cierra el panel de la derecha;
 * al apagarlo el panel no se reabre. Si el usuario abre un panel mientras está activo (una pestaña o un objeto
 * del mapa), sale solo del modo: lo que pidió ver y los controles del mapa vuelven juntos.
 */
export function useModoEnfoque(panelAbierto: boolean, cerrarPanel: () => void) {
  const [enfoque, setEnfoque] = useState(false);
  // Ajuste durante el render (patrón de React para derivar estado de una prop), sin repintado extra.
  if (enfoque && panelAbierto) setEnfoque(false);
  const cambiar = (activo: boolean) => {
    if (activo) cerrarPanel();
    setEnfoque(activo);
  };
  return { enfoque: enfoque && !panelAbierto, cambiar };
}
