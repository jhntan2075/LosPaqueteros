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
