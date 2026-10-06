import type { Coordenada } from '../types/domain';

// Parámetros de negocio del dominio. Replican pe.pucp.paqtracker.modelo.ConfiguracionDominio
// del planificador: si cambian allá, deben cambiar aquí hasta que paqtracker-api los exponga.

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

/** Ocupación de una unidad (CF-02): ámbar desde 70 %, rojo desde 90 %. */
export const CORTE_OCUPACION = { ambar: 0.7, rojo: 0.9 };

/** Holgura restante (CF-02): rojo bajo 15 % del plazo, ámbar hasta 40 %. */
export const CORTE_HOLGURA = { rojo: 0.15, ambar: 0.4 };

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

/** Plazos de entrega del catálogo, en horas. 36 h es la entrega regular; el resto son priorizadas. */
export const PLAZOS_HORAS = [36, 18, 12, 8, 4] as const;
export type PlazoHoras = (typeof PLAZOS_HORAS)[number];

export const esPlazoRegular = (plazo: PlazoHoras) => plazo === 36;
