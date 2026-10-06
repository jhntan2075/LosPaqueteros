import {
  ALMACENES,
  CORTE_HOLGURA,
  MALLA_ALTO_KM,
  MALLA_ANCHO_KM,
  TIEMPO_SERVICIO_MINUTOS,
  TIPOS_UNIDAD,
  UNIDADES,
  type AlmacenDominio,
  type PlazoHoras,
  type TipoUnidad,
} from '../config/dominio';
import type { Coordenada } from '../types/domain';
import type { NivelHolgura } from '../types/pedidos';
import { capitalizar, unirAlternativas } from './formato';

// Estimación previa al registro (panel "Factibilidad en vivo" de PE-01). Usa distancia
// Manhattan sin bloqueos: es una cota optimista, la ruta real la decide el planificador.

export type NivelFactibilidad = 'FACTIBLE' | 'AJUSTADA' | 'NO_FACTIBLE';

export interface DistanciaAlmacen {
  almacen: AlmacenDominio;
  km: number;
}

export interface EvaluacionFactibilidad {
  distancias: DistanciaAlmacen[]; // de la más cercana a la más lejana
  origen: DistanciaAlmacen;
  nivel: NivelFactibilidad;
  mensaje: string;
  tiposSugeridos: TipoUnidad[];
  vehiculoSugerido: string;
  minutosViaje: number | null; // con la unidad sugerida más rápida, sin acondicionamiento
  unidadesNecesarias: number;
}

export const distanciaManhattan = (a: Coordenada, b: Coordenada) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const coordenadaValida = ({ x, y }: Coordenada) =>
  Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x <= MALLA_ANCHO_KM && y >= 0 && y <= MALLA_ALTO_KM;

const minutosDeViaje = (km: number, tipo: TipoUnidad) => (km / UNIDADES[tipo].velocidadKmH) * 60;

export function evaluarFactibilidad(destino: Coordenada, cantidad: number, plazoHoras: PlazoHoras): EvaluacionFactibilidad {
  const distancias = ALMACENES.map((almacen) => ({ almacen, km: distanciaManhattan(almacen.ubicacion, destino) })).sort(
    (a, b) => a.km - b.km,
  );
  const origen = distancias[0];
  const plazoMinutos = plazoHoras * 60;

  const llegan = TIPOS_UNIDAD.filter((tipo) => minutosDeViaje(origen.km, tipo) + TIEMPO_SERVICIO_MINUTOS <= plazoMinutos);
  const noLlegan = TIPOS_UNIDAD.filter((tipo) => !llegan.includes(tipo));

  // Se sugieren las unidades que llegan a tiempo y llevan todo en un viaje; si ninguna
  // tiene capacidad, la más grande que llegue (el pedido se fraccionará).
  const conCapacidad = llegan.filter((tipo) => UNIDADES[tipo].capacidad >= cantidad);
  const tiposSugeridos = conCapacidad.length > 0 ? conCapacidad : llegan.slice(-1);

  const nombres = (tipos: TipoUnidad[]) => tipos.map((tipo) => UNIDADES[tipo].nombre);
  const encabezado = `El nodo (${destino.x},${destino.y}) está a ${origen.km} km del ${origen.almacen.nombre} por ruta ortogonal.`;

  let nivel: NivelFactibilidad;
  let mensaje: string;
  if (llegan.length === 0) {
    nivel = 'NO_FACTIBLE';
    mensaje = `${encabezado} Ninguna unidad llega en ${plazoHoras} h — el pedido se registrará en riesgo de incumplimiento.`;
  } else if (noLlegan.length > 0) {
    nivel = 'AJUSTADA';
    mensaje = `${encabezado} Con ${unirAlternativas(nombres(noLlegan), 'ni')} no llega en ${plazoHoras} h — se sugiere asignar ${unirAlternativas(nombres(tiposSugeridos))}.`;
  } else {
    nivel = 'FACTIBLE';
    mensaje = `${encabezado} Cualquier tipo de unidad llega dentro de las ${plazoHoras} h.`;
  }

  const masRapida = tiposSugeridos[tiposSugeridos.length - 1];
  const capacidadMayor = Math.max(0, ...tiposSugeridos.map((tipo) => UNIDADES[tipo].capacidad));

  return {
    distancias,
    origen,
    nivel,
    mensaje,
    tiposSugeridos,
    vehiculoSugerido: tiposSugeridos.length > 0 ? capitalizar(unirAlternativas(nombres(tiposSugeridos))) : '—',
    minutosViaje: masRapida ? Math.round(minutosDeViaje(origen.km, masRapida)) : null,
    unidadesNecesarias: capacidadMayor > 0 ? Math.ceil(cantidad / capacidadMayor) : 0,
  };
}

/** Semáforo de holgura según la fracción del plazo que queda libre. */
export const nivelDeHolgura = (holguraMinutos: number, plazoMinutos: number): NivelHolgura => {
  const fraccion = holguraMinutos / plazoMinutos;
  if (fraccion > CORTE_HOLGURA.ambar) return 'VERDE';
  if (fraccion >= CORTE_HOLGURA.rojo) return 'AMBAR';
  return 'ROJO';
};
