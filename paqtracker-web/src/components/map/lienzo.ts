import type { Lienzo } from '../../lib/malla';
import { ALTO_PILA_CON_RESUMEN_PX, izquierdaDeLaBarra } from './estilosMapa';

// Geometría del lienzo del mapa: cuánto espacio se reserva alrededor de la malla para que los controles que
// flotan encima no la tapen en la vista completa.

/** Distancia del borde derecho a las herramientas y al zoom, y del borde inferior al zoom y a la escala. */
const DERECHA_CONTROLES_PX = 12;
export const INFERIOR_CONTROLES_PX = 12;
/** Distancia del borde inferior a los controles de abajo: se apoyan sobre una hoja inferior abierta. */
export const inferiorDeControles = (altoPanelInferior: number) =>
  altoPanelInferior > 0 ? altoPanelInferior + INFERIOR_CONTROLES_PX : INFERIOR_CONTROLES_PX;
/** Un panel flotante a la derecha (diagnóstico de la simulación) empuja las herramientas y el zoom a su izquierda. */
export const derechaDeControles = (anchoPanelDerecho: number) => (anchoPanelDerecho > 0 ? anchoPanelDerecho + 24 : DERECHA_CONTROLES_PX);
/** Lugar al pie para la barra de escala y la coordenada del nodo. */
const PIE_PX = 44;

/**
 * La malla de 70 × 50 km se encuadra completa ('contener') y es lo único que lleva cuadrícula: alrededor
 * queda un margen neutro que marca su límite. Los controles flotan sobre el mapa: la barra de herramientas
 * en su margen derecho y la escala al pie, así que ninguno tapa la malla en la vista completa; la pila de
 * búsqueda y alertas, a la izquierda, sí puede cubrir su esquina en escritorio. En compacto la malla llena el
 * ancho y no deja esquina libre: se reserva arriba la pila reducida (buscador, fila de alertas y franja de
 * resumen) para que la vista inicial empiece debajo de ella.
 */
export const crearLienzo = (ancho: number, alto: number, anchoPanelDerecho: number, altoPanelInferior: number, compacto: boolean): Lienzo => {
  if (compacto) {
    return {
      ancho,
      alto,
      margen: 12,
      margenSuperior: ALTO_PILA_CON_RESUMEN_PX + 8,
      margenInferior: altoPanelInferior > 0 ? altoPanelInferior + 12 : PIE_PX,
      ajuste: 'contener',
    };
  }
  return {
    ancho,
    alto,
    margen: 32,
    margenInferior: PIE_PX,
    margenDerecho: izquierdaDeLaBarra(derechaDeControles(anchoPanelDerecho)),
    ajuste: 'contener',
  };
};
