import { TIEMPO_SERVICIO_MINUTOS, UNIDADES } from '../config/dominio';
import type { Coordenada } from '../types/domain';
import type { UnidadOperacion } from '../types/operacion';
import { puntoEnRecorrido } from './malla';

// Movimiento de las unidades sobre la malla a partir del reloj simulado, mientras paqtracker-api no
// publique posiciones. Cada unidad recorre su ruta ortogonal a la velocidad de su tipo (LE-021), se
// detiene TIEMPO_SERVICIO_MINUTOS en cada parada, vuelve a su almacén, carga y repite el ciclo.
// En el instante 0 cada unidad está en la `posicion` del conjunto de ejemplo.

const MINUTOS_CARGA_EN_ALMACEN = 30;

const largo = (puntos: Coordenada[]) =>
  puntos.slice(1).reduce((total, p, i) => total + Math.abs(p.x - puntos[i].x) + Math.abs(p.y - puntos[i].y), 0);

/** Distancia (km) recorrida sobre la ruta hasta un nodo que está sobre ella. */
function distanciaHasta(ruta: Coordenada[], punto: Coordenada): number {
  let acumulado = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const a = ruta[i];
    const b = ruta[i + 1];
    const enTramo =
      (a.y === b.y && punto.y === a.y && punto.x >= Math.min(a.x, b.x) && punto.x <= Math.max(a.x, b.x)) ||
      (a.x === b.x && punto.x === a.x && punto.y >= Math.min(a.y, b.y) && punto.y <= Math.max(a.y, b.y));
    if (enTramo) return acumulado + Math.abs(punto.x - a.x) + Math.abs(punto.y - a.y);
    acumulado += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  }
  return 0;
}

type Fase = { tipo: 'viaje'; desdeKm: number; hastaKm: number; minutos: number; vuelta: boolean } | { tipo: 'pausa'; enKm: number; minutos: number; vuelta: boolean };

/** Ciclo completo de una unidad: ida con paradas, regreso al almacén y carga. */
function cicloDe(unidad: UnidadOperacion): Fase[] {
  const kmPorMinuto = UNIDADES[unidad.tipo].velocidadKmH / 60;
  const total = largo(unidad.ruta);
  const paradas = unidad.paradas.map((p) => distanciaHasta(unidad.ruta, p.destino)).sort((a, b) => a - b);
  const fases: Fase[] = [];
  let km = 0;
  for (const parada of paradas) {
    if (parada > km) fases.push({ tipo: 'viaje', desdeKm: km, hastaKm: parada, minutos: (parada - km) / kmPorMinuto, vuelta: false });
    fases.push({ tipo: 'pausa', enKm: parada, minutos: TIEMPO_SERVICIO_MINUTOS, vuelta: false });
    km = parada;
  }
  if (total > km) fases.push({ tipo: 'viaje', desdeKm: km, hastaKm: total, minutos: (total - km) / kmPorMinuto, vuelta: false });
  fases.push({ tipo: 'viaje', desdeKm: 0, hastaKm: total, minutos: total / kmPorMinuto, vuelta: true });
  fases.push({ tipo: 'pausa', enKm: total, minutos: MINUTOS_CARGA_EN_ALMACEN, vuelta: true });
  return fases;
}

/** Unidad en el instante `minutos` (simulados, desde el instante 0 del conjunto de ejemplo). */
export function unidadEnElInstante(unidad: UnidadOperacion, minutos: number): UnidadOperacion {
  if (unidad.estado !== 'EN_RUTA' || unidad.ruta.length < 2) return unidad;
  const fases = cicloDe(unidad);
  const duracion = fases.reduce((t, f) => t + f.minutos, 0);
  const total = largo(unidad.ruta);

  // Desfase del ciclo para que en el minuto 0 la unidad esté en su posición de ejemplo (de ida).
  const kmInicial = distanciaHasta(unidad.ruta, unidad.posicion);
  let desfase = 0;
  for (const f of fases) {
    if (f.vuelta) break;
    if (f.tipo === 'pausa') {
      if (f.enKm >= kmInicial) break;
      desfase += f.minutos;
    } else if (kmInicial <= f.hastaKm) {
      desfase += (f.minutos * (kmInicial - f.desdeKm)) / Math.max(1e-9, f.hastaKm - f.desdeKm);
      break;
    } else {
      desfase += f.minutos;
    }
  }

  let t = (((desfase + minutos) % duracion) + duracion) % duracion;
  for (const f of fases) {
    if (t > f.minutos) {
      t -= f.minutos;
      continue;
    }
    const km = f.tipo === 'pausa' ? f.enKm : f.desdeKm + ((f.hastaKm - f.desdeKm) * t) / Math.max(1e-9, f.minutos);
    // De regreso la ruta se recorre al revés: lo pendiente es el camino al almacén.
    const ruta = f.vuelta ? [...unidad.ruta].reverse() : unidad.ruta;
    const { punto } = puntoEnRecorrido(ruta, total === 0 ? 0 : km / total);
    return { ...unidad, posicion: punto, ruta };
  }
  return unidad;
}

export const unidadesEnElInstante = (unidades: UnidadOperacion[], minutos: number) => unidades.map((u) => unidadEnElInstante(u, minutos));
