import type { TipoUnidad } from '../../config/dominio';
import { ATENCION, COLOR_NIVEL, CRITICO, NEUTRO, OK } from '../../config/colores';
import { nivelDeOcupacion } from '../../lib/operacion';
import type { UnidadOperacion } from '../../types/operacion';

import autoSvg from '../../assets/figma/pedidos/icono-auto.svg?raw';
import motoSvg from '../../assets/figma/pedidos/icono-moto.svg?raw';
import biciSvg from '../../assets/figma/pedidos/icono-bici.svg?raw';

// Íconos de unidad del lienzo de Figma (icono/auto 1:1359, icono/moto 1:1349, icono/bici 1:1368).
// La geometría, el contorno blanco y la sombra son los del archivo; solo cambia el color del
// cuerpo, que en el diseño indica la ocupación (verde, ámbar, rojo) o la avería.
// Se usan como data URI en <image>: el auto y la bici comparten ids de filtro y máscara, que
// chocarían si se insertaran en línea en el mismo SVG.

interface FuenteIcono {
  svg: string;
  colorOriginal: string;
  ancho: number;
  alto: number;
  /** Centro de la silueta visible dentro del SVG (el resto es margen de la sombra). */
  centroX: number;
  centroY: number;
}

const FUENTES: Record<TipoUnidad, FuenteIcono> = {
  AUTO: { svg: autoSvg, colorOriginal: ATENCION, ancho: 28.3998, alto: 18.6, centroX: 4.3 + 19.8 / 2, centroY: 3.3 + 10 / 2 },
  MOTO: { svg: motoSvg, colorOriginal: ATENCION, ancho: 29.393, alto: 19.6566, centroX: 4.3 + 20.79 / 2, centroY: 3.3 + 11.06 / 2 },
  BICICLETA: { svg: biciSvg, colorOriginal: OK, ancho: 30.0502, alto: 21.6361, centroX: 4.3 + 21.45 / 2, centroY: 3.3 + 13.04 / 2 },
};

/** Semáforo de carga (verde, ámbar, rojo) y gris cuando no hay dato. */
export const COLOR_CARGA = COLOR_NIVEL;
export const COLOR_SIN_DATO = NEUTRO[500];
const COLOR_AVERIADA = CRITICO;

/** Color de una unidad en toda la interfaz: rojo si está averiada; si no, el semáforo de su carga. */
export const colorDeUnidad = (u: Pick<UnidadOperacion, 'estado' | 'carga' | 'capacidad'>) =>
  u.estado === 'AVERIADA' ? COLOR_AVERIADA : COLOR_CARGA[nivelDeOcupacion(u.carga, u.capacidad)];

/** Color de un conjunto de unidades por su carga total; gris si no hay capacidad (ninguna fuera). */
export const colorDeCarga = (carga: number, capacidad: number) =>
  capacidad === 0 ? COLOR_SIN_DATO : COLOR_CARGA[nivelDeOcupacion(carga, capacidad)];

export interface IconoVehiculoMapa {
  href: string;
  ancho: number;
  alto: number;
  centroX: number;
  centroY: number;
  /** Medio ancho de la silueta visible, para ubicar el rótulo a su derecha. */
  medioAnchoVisible: number;
}

const cache = new Map<string, IconoVehiculoMapa>();

export function iconoVehiculo(tipo: TipoUnidad, color: string): IconoVehiculoMapa {
  const clave = `${tipo}${color}`;
  const enCache = cache.get(clave);
  if (enCache) return enCache;
  const fuente = FUENTES[tipo];
  const svg = fuente.svg.replace(`fill="${fuente.colorOriginal}"`, `fill="${color}"`);
  const icono = {
    href: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    ancho: fuente.ancho,
    alto: fuente.alto,
    centroX: fuente.centroX,
    centroY: fuente.centroY,
    medioAnchoVisible: fuente.centroX - 4.3,
  };
  cache.set(clave, icono);
  return icono;
}
