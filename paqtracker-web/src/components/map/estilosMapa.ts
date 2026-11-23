// Medidas y estilo compartidos por los controles que flotan sobre el mapa (buscador, alertas, ocupación,
// herramientas, zoom y escala). En un archivo propio para no exportar constantes junto a un componente.

/** Tarjeta blanca de un control flotante. */
export const TARJETA_FLOTANTE = 'bg-superficie border border-neutral-200 rounded-card shadow-overlay';

/** Alto de una fila tocable (objetivo táctil mínimo). */
export const ALTO_TARJETA_PX = 44;

/**
 * Alto de la pila de arriba a la izquierda en su forma reducida (buscador + una fila de alertas), con su
 * distancia al borde (12 px) y el aire entre tarjetas (8 px): lo que el lienzo compacto reserva arriba.
 */
export const ALTO_PILA_REDUCIDA_PX = 12 + ALTO_TARJETA_PX + 8 + ALTO_TARJETA_PX;

/** Bajo este alto del mapa, la pila se muestra reducida aunque el ancho sea de escritorio. */
export const ALTO_MAPA_REDUCIDO_PX = 560;

/** Lugar que ocupa la barra de herramientas (44 px + relleno) y su aire: los popovers se anclan a su izquierda. */
const SEPARACION_BARRA_PX = 56;
/** Distancia del borde derecho del mapa al borde izquierdo de la barra: donde termina el popover por la derecha. */
export const izquierdaDeLaBarra = (derechaBarraPx: number) => derechaBarraPx + SEPARACION_BARRA_PX;

/** Bajo este ancho del mapa, los popovers ocupan todo el espacio libre a la izquierda de la barra. */
export const ANCHO_ANGOSTO_PX = 600;

// Franja de resumen (ResumenMapa): va en el centro de arriba, en el espacio que dejan la pila de la izquierda y la
// barra de herramientas de la derecha; si ahí no cabe (celular o poco ancho), se une a la pila, bajo las alertas.

/** Distancia de las tarjetas flotantes a los bordes del mapa y entre sí. */
export const AIRE_FLOTANTE_PX = 12;
/** Ancho máximo de la pila de arriba a la izquierda. */
export const ANCHO_PILA_MAX_PX = 340;
/** Lo que la pila deja libre a su derecha: aire + barra de herramientas (44 px + relleno) + aire. */
export const RESERVA_PILA_PX = 88;
/** Ancho de la barra de herramientas: un botón de 44 px y su relleno. */
export const ANCHO_BARRA_PX = 52;
/** Alto de la franja de resumen. */
export const ALTO_RESUMEN_PX = ALTO_TARJETA_PX;

/** Alto de la pila reducida con la franja de resumen bajo las alertas: lo que el lienzo compacto reserva arriba. */
export const ALTO_PILA_CON_RESUMEN_PX = ALTO_PILA_REDUCIDA_PX + 8 + ALTO_RESUMEN_PX;

/** Ancho mínimo de la franja (dos métricas y el botón): más angosta, pasa a la pila. */
const ANCHO_RESUMEN_MIN_PX = 288;
/** Ancho desde el que caben las cuatro métricas. */
const ANCHO_RESUMEN_CUATRO_PX = 400;
const ANCHO_RESUMEN_MAX_PX = { 2: 360, 4: 520 } as const;

export type UbicacionResumen =
  | { donde: 'centro'; izquierdaPx: number; anchoPx: number; metricas: 2 | 4 }
  | { donde: 'pila'; metricas: 2 };

/**
 * Dónde va la franja de resumen: centrada en el ancho libre entre la pila de la izquierda y la barra de la
 * derecha (que se corre a la izquierda de un panel flotante), sin tocar ninguna. Lleva las cuatro métricas
 * solo si el ancho libre las admite; con el mapa angosto (< ANCHO_ANGOSTO_PX) ni siquiera queda ancho libre,
 * así que va dentro de la pila con dos. Lo mismo en compacto o si el espacio no alcanza.
 */
export const ubicarResumen = (anchoMapa: number, derechaBarraPx: number, compacto: boolean): UbicacionResumen => {
  const anchoPila = Math.min(ANCHO_PILA_MAX_PX, anchoMapa - RESERVA_PILA_PX);
  const izquierdaLibre = AIRE_FLOTANTE_PX + anchoPila + AIRE_FLOTANTE_PX;
  const derechaLibre = anchoMapa - (derechaBarraPx + ANCHO_BARRA_PX + AIRE_FLOTANTE_PX);
  const libre = derechaLibre - izquierdaLibre;
  if (compacto || libre < ANCHO_RESUMEN_MIN_PX) return { donde: 'pila', metricas: 2 };
  const metricas = libre >= ANCHO_RESUMEN_CUATRO_PX ? 4 : 2;
  const anchoPx = Math.min(libre, ANCHO_RESUMEN_MAX_PX[metricas]);
  return { donde: 'centro', izquierdaPx: Math.round(izquierdaLibre + (libre - anchoPx) / 2), anchoPx: Math.round(anchoPx), metricas };
};
