import { useState, type RefObject } from 'react';
import { useTamanoElemento } from './useTamanoElemento';

/** Bajo este ancho (px) el mapa pasa a la presentación compacta: cajón de controles y pestañas al pie. */
export const ANCHO_COMPACTO_PX = 768;
/** Bajo este ancho, si el contenedor es vertical, el panel se abre como hoja inferior. */
export const ANCHO_HOJA_VERTICAL_PX = 1280;
/** Alto de la barra de pestañas horizontal (compacta), que no es parte del mapa. */
const ALTO_PESTANAS_PX = 56;
/** Fracción del alto del mapa que ocupa la hoja inferior a media altura. */
const FRACCION_HOJA = 0.48;

/**
 * Presentación del mapa y su panel según el espacio real del contenedor (no del viewport: así funciona
 * igual dentro de Operación y de la simulación):
 *  - escritorio: columna de controles, mapa, panel lateral y pestañas verticales;
 *  - tablet vertical: lo mismo, pero el panel se abre como hoja inferior;
 *  - celular (< 768 px): controles en cajón, chip de alertas, hoja inferior y pestañas al pie.
 */
export function usePresentacionMapa(ref: RefObject<HTMLElement | null>, panelAbierto: boolean) {
  const { ancho, alto } = useTamanoElemento(ref);
  const medido = ancho > 0 && alto > 0;
  const compacto = medido && ancho < ANCHO_COMPACTO_PX;
  const hoja = compacto || (medido && ancho < ANCHO_HOJA_VERTICAL_PX && alto > ancho);
  const [hojaCompleta, setHojaCompleta] = useState(false);
  const altoMapa = alto - (compacto ? ALTO_PESTANAS_PX : 0);
  // Con la hoja completa el mapa queda cubierto: no se reencuadra, para no saltar al reducirla.
  const altoPanelInferior = hoja && panelAbierto && !hojaCompleta ? Math.round(altoMapa * FRACCION_HOJA) : 0;
  return {
    compacto,
    presentacionPanel: hoja ? ('hoja' as const) : ('lateral' as const),
    hojaCompleta,
    alternarHoja: () => setHojaCompleta(!hojaCompleta),
    altoPanelInferior,
  };
}
