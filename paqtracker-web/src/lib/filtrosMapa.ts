import { TIPOS_UNIDAD, type IdAlmacen, type TipoUnidad } from '../config/dominio';
import type { AlmacenOperacion, UnidadOperacion } from '../types/operacion';
import { NIVELES_CARGA, nivelDeOcupacion, type NivelCarga } from './semaforo';

// Filtros globales del mapa (rúbrica D05–D07): tipo de unidad, carga de unidades y stock de almacenes, con
// el semáforo + vacío. En cada grupo, sin nada marcado se muestra todo; lo marcado restringe a esos valores.
// Es estado de cada navegador (C06): no se comparte con otros visualizadores.

export interface FiltrosMapa {
  tipos: TipoUnidad[];
  carga: NivelCarga[];
  stock: NivelCarga[];
}

export const SIN_FILTROS: FiltrosMapa = { tipos: [], carga: [], stock: [] };

export const cantidadFiltros = (f: FiltrosMapa) => f.tipos.length + f.carga.length + f.stock.length;

/** Marca o desmarca un valor de un grupo. */
export const alternar = <T>(lista: T[], valor: T): T[] => (lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

export const unidadPasaFiltros = (f: FiltrosMapa, u: Pick<UnidadOperacion, 'tipo' | 'carga' | 'capacidad'>) =>
  (f.tipos.length === 0 || f.tipos.includes(u.tipo)) && (f.carga.length === 0 || f.carga.includes(nivelDeOcupacion(u.carga, u.capacidad)));

/** El central no tiene tope ni semáforo: el filtro de stock no lo oculta. */
export const almacenPasaFiltros = (f: FiltrosMapa, id: IdAlmacen, estado: AlmacenOperacion | undefined) =>
  id === 'CENTRAL' || f.stock.length === 0 || (estado?.nivelStock != null && f.stock.includes(estado.nivelStock));

const CLAVE = 'paqtracker.filtrosMapa';

const soloValidos = <T>(valor: unknown, permitidos: readonly T[]): T[] =>
  Array.isArray(valor) ? permitidos.filter((p) => valor.includes(p)) : [];

/** Lee los filtros guardados en este navegador; sin almacenamiento o con datos inválidos, sin filtros. */
export function leerFiltros(): FiltrosMapa {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Partial<Record<keyof FiltrosMapa, unknown>> | null;
    if (!crudo || typeof crudo !== 'object') return SIN_FILTROS;
    return {
      tipos: soloValidos(crudo.tipos, TIPOS_UNIDAD),
      carga: soloValidos(crudo.carga, NIVELES_CARGA),
      stock: soloValidos(crudo.stock, NIVELES_CARGA),
    };
  } catch {
    return SIN_FILTROS;
  }
}

export function guardarFiltros(f: FiltrosMapa) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(f));
  } catch {
    // Sin almacenamiento disponible: los filtros duran solo esta sesión.
  }
}
