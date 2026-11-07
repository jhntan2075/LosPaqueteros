import type { Coordenada } from '../types/domain';
import type { ParametrosAveriaApi, ParametrosDominioApi } from '../types/api';
import { obtenerRangos } from './rangosSemaforo';

// Parámetros de negocio del dominio. Los valores de abajo son los por defecto de
// pe.pucp.paqtracker.modelo.ConfiguracionDominio; los que el operador configura (ubicación de almacenes,
// capacidad, velocidad y costo de las unidades, duraciones de las averías) llegan de paqtracker-api al
// arrancar y con cada cambio (aplicarParametrosDominio), y se escriben sobre estos mismos objetos.

export const MALLA_ANCHO_KM = 70;
export const MALLA_ALTO_KM = 50;

/** Tiempo de acondicionamiento del producto por entrega, en minutos. */
export const TIEMPO_SERVICIO_MINUTOS = 60;

export type TipoUnidad = 'AUTO' | 'MOTO' | 'BICICLETA';

export interface ParametrosUnidad {
  nombre: string;
  prefijoCodigo: string;
  capacidad: number;
  velocidadKmH: number;
  costoKm: number;
  cantidad: number;
}

/** Capacidad (LE-020), velocidad (LE-021), costo por km (LE-022) y unidades en la flota de cada tipo. */
export const UNIDADES: Record<TipoUnidad, ParametrosUnidad> = {
  AUTO: { nombre: 'auto', prefijoCodigo: 'A', capacidad: 24, velocidadKmH: 40, costoKm: 1.2, cantidad: 10 },
  MOTO: { nombre: 'moto', prefijoCodigo: 'M', capacidad: 8, velocidadKmH: 25, costoKm: 0.6, cantidad: 15 },
  BICICLETA: { nombre: 'bicicleta', prefijoCodigo: 'B', capacidad: 4, velocidadKmH: 12, costoKm: 0.15, cantidad: 12 },
};

/** Turnos de 8 h (LE-023), en minutos del día. */
export const INICIOS_TURNO_MINUTOS = [7 * 60, 15 * 60, 23 * 60];

// Cortes de los semáforos. Los configura el operador (leyenda del mapa → "Configurar rangos") y los guarda
// paqtracker-api; cada lectura toma el valor vigente de config/rangosSemaforo.ts, así un cambio rige en
// el siguiente dibujo. Los valores por defecto son los de RANGOS_POR_DEFECTO.

/** Ocupación de una unidad (CF-02): vacío hasta `vacio`, ámbar desde `ambar`, rojo desde `rojo`. */
export const CORTE_OCUPACION = {
  get vacio() { return obtenerRangos().ocupacionUnidad.vacio; },
  get ambar() { return obtenerRangos().ocupacionUnidad.ambar; },
  get rojo() { return obtenerRangos().ocupacionUnidad.rojo; },
};

/** Holgura restante (CF-02): rojo bajo `rojo` del plazo, ámbar bajo `ambar`. La calcula paqtracker-api. */
export const CORTE_HOLGURA = {
  get rojo() { return obtenerRangos().holgura.rojo; },
  get ambar() { return obtenerRangos().holgura.ambar; },
};

/** Ocupación de un almacén intermedio (semáforo + vacío de la rúbrica, rojo = lleno). */
export const CORTE_STOCK = {
  get vacio() { return obtenerRangos().ocupacionAlmacen.vacio; },
  get ambar() { return obtenerRangos().ocupacionAlmacen.ambar; },
  get rojo() { return obtenerRangos().ocupacionAlmacen.rojo; },
};

/**
 * Alerta de stock bajo de un almacén intermedio (LE-078), aparte del semáforo de ocupación. La calcula
 * paqtracker-api con los mismos cortes.
 */
export const CORTE_INVENTARIO = {
  get rojo() { return obtenerRangos().inventario.rojo; },
  get ambar() { return obtenerRangos().inventario.ambar; },
};

/** Orden de evaluación: de la unidad más lenta a la más rápida. */
export const TIPOS_UNIDAD: TipoUnidad[] = ['BICICLETA', 'MOTO', 'AUTO'];

export type IdAlmacen = 'CENTRAL' | 'INTERMEDIO_1' | 'INTERMEDIO_2';

export interface AlmacenDominio {
  id: IdAlmacen;
  nombre: string;
  nombreCorto: string;
  ubicacion: Coordenada;
}

export const ALMACENES: AlmacenDominio[] = [
  { id: 'CENTRAL', nombre: 'Central', nombreCorto: 'Central', ubicacion: { x: 27, y: 14 } },
  { id: 'INTERMEDIO_1', nombre: 'Intermedio 1', nombreCorto: 'Int. 1', ubicacion: { x: 12, y: 38 } },
  { id: 'INTERMEDIO_2', nombre: 'Intermedio 2', nombreCorto: 'Int. 2', ubicacion: { x: 57, y: 27 } },
];

/** Duraciones de las averías vigentes (B07-B09), en minutos. */
export const DURACIONES_AVERIA: ParametrosAveriaApi = {
  tipo1Minutos: 120,
  permanenciaSitioMinutos: 240,
  tipo3MinimoMinutos: 2 * 1440,
  trasvaseMinutos: 30,
};

let versionParametros = 0;
const oyentesParametros = new Set<() => void>();

/** Cambia cada vez que llegan parámetros nuevos de la API; lo usa useParametrosDominio. */
export const obtenerVersionParametros = () => versionParametros;

export function suscribirParametros(oyente: () => void): () => void {
  oyentesParametros.add(oyente);
  return () => {
    oyentesParametros.delete(oyente);
  };
}

/**
 * Escribe los parámetros vigentes de la API sobre ALMACENES, UNIDADES y DURACIONES_AVERIA (se mutan en el
 * lugar, así cada lectura toma el valor nuevo) y avisa a los suscriptores para volver a dibujar.
 */
export function aplicarParametrosDominio(parametros: ParametrosDominioApi): void {
  for (const almacen of parametros.almacenes) {
    const destino = ALMACENES.find((a) => a.id === almacen.codigo);
    if (destino) destino.ubicacion = { x: almacen.x, y: almacen.y };
  }
  for (const unidad of parametros.unidades) {
    const destino = UNIDADES[unidad.tipo];
    if (!destino) continue;
    destino.capacidad = unidad.capacidad;
    destino.velocidadKmH = unidad.velocidadKmH;
    destino.costoKm = unidad.costoPorKm;
  }
  Object.assign(DURACIONES_AVERIA, parametros.averias);
  versionParametros += 1;
  oyentesParametros.forEach((oyente) => oyente());
}

/** "2 h", "90 min", "1 h 30 min", "2 días". */
export function formatearDuracion(minutos: number): string {
  if (minutos >= 1440 && minutos % 1440 === 0) return `${minutos / 1440} ${minutos === 1440 ? 'día' : 'días'}`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Plazos de entrega del catálogo, en horas. 36 h es la entrega regular; el resto son priorizadas. */
export const PLAZOS_HORAS = [36, 18, 12, 8, 4] as const;
export type PlazoHoras = (typeof PLAZOS_HORAS)[number];

export const esPlazoRegular = (plazoHoras: number) => plazoHoras === 36;
