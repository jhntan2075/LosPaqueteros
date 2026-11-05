import type { TipoUnidad } from '../../config/dominio';
import { COLOR_SEMAFORO, nivelDeOcupacion } from '../../lib/semaforo';
import type { UnidadOperacion } from '../../types/operacion';

import autoSvg from '../../assets/figma/pedidos/icono-auto.svg?raw';
import motoSvg from '../../assets/figma/pedidos/icono-moto.svg?raw';
import biciSvg from '../../assets/figma/pedidos/icono-bici.svg?raw';

// Íconos de unidad del lienzo de Figma (icono/auto 1:1359, icono/moto 1:1349, icono/bici 1:1368).
// La geometría, el contorno blanco y la sombra son los del archivo; solo cambia el color del
// cuerpo, que indica la ocupación (vacío hueco, verde, ámbar, rojo) o la avería.
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
  AUTO: { svg: autoSvg, colorOriginal: '#B45309', ancho: 28.3998, alto: 18.6, centroX: 4.3 + 19.8 / 2, centroY: 3.3 + 10 / 2 },
  MOTO: { svg: motoSvg, colorOriginal: '#B45309', ancho: 29.393, alto: 19.6566, centroX: 4.3 + 20.79 / 2, centroY: 3.3 + 11.06 / 2 },
  BICICLETA: { svg: biciSvg, colorOriginal: '#15803D', ancho: 30.0502, alto: 21.6361, centroX: 4.3 + 21.45 / 2, centroY: 3.3 + 13.04 / 2 },
};

/** Gris sólido cuando no hay dato; distinto del "vacío", que se dibuja hueco. */
export const COLOR_SIN_DATO = '#64748B';
const COLOR_AVERIADA = '#B91C1C';

type UnidadConCarga = Pick<UnidadOperacion, 'tipo' | 'estado' | 'carga' | 'capacidad'>;

/** Color de una unidad en toda la interfaz: rojo si está averiada; si no, el semáforo + vacío de su carga. */
export const colorDeUnidad = (u: Omit<UnidadConCarga, 'tipo'>) =>
  u.estado === 'AVERIADA' ? COLOR_AVERIADA : COLOR_SEMAFORO[nivelDeOcupacion(u.carga, u.capacidad)];

/** Unidad sin carga (y no averiada): su ícono va hueco. */
export const unidadVacia = (u: Omit<UnidadConCarga, 'tipo'>) =>
  u.estado !== 'AVERIADA' && nivelDeOcupacion(u.carga, u.capacidad) === 'VACIO';

/** Ícono de una unidad con su color y, si va vacía, hueco. */
export const iconoDeUnidad = (u: UnidadConCarga) => iconoVehiculo(u.tipo, colorDeUnidad(u), unidadVacia(u));

/** Ícono de un conjunto de unidades por su carga total; gris sólido si no hay capacidad (ninguna fuera). */
export const iconoDeCarga = (tipo: TipoUnidad, carga: number, capacidad: number) => {
  if (capacidad === 0) return iconoVehiculo(tipo, COLOR_SIN_DATO);
  const nivel = nivelDeOcupacion(carga, capacidad);
  return iconoVehiculo(tipo, COLOR_SEMAFORO[nivel], nivel === 'VACIO');
};

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

/** `hueco`: cuerpo blanco con contorno del color, para la unidad vacía. */
export function iconoVehiculo(tipo: TipoUnidad, color: string, hueco = false): IconoVehiculoMapa {
  const clave = `${tipo}${color}${hueco ? 'hueco' : ''}`;
  const enCache = cache.get(clave);
  if (enCache) return enCache;
  const fuente = FUENTES[tipo];
  const relleno = hueco ? `fill="#FFFFFF" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"` : `fill="${color}"`;
  const svg = fuente.svg.replace(`fill="${fuente.colorOriginal}"`, relleno);
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
