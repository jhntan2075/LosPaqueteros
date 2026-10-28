import { CORTE_HOLGURA, CORTE_INVENTARIO, CORTE_OCUPACION, esPlazoRegular } from './dominio';
import type { EstadoUnidad, SituacionUnidad } from '../types/operacion';
import type { NivelHolgura } from '../types/pedidos';

// Glosario de la interfaz: un solo nombre por concepto en todas las pantallas. Si un término cambia,
// cambia aquí.

const porcentaje = (fraccion: number) => Math.round(fraccion * 100);

/** Nivel del semáforo de holgura. */
export const NOMBRE_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: 'Crítico',
  AMBAR: 'Ajustado',
  VERDE: 'Holgado',
  CERRADO: 'Cerrado',
};

/** Rango de holgura restante (fracción del plazo) de cada nivel, p. ej. "15–40 %". */
export const RANGO_HOLGURA: Record<Exclude<NivelHolgura, 'CERRADO'>, string> = {
  ROJO: `< ${porcentaje(CORTE_HOLGURA.rojo)} %`,
  AMBAR: `${porcentaje(CORTE_HOLGURA.rojo)}–${porcentaje(CORTE_HOLGURA.ambar)} %`,
  VERDE: `> ${porcentaje(CORTE_HOLGURA.ambar)} %`,
};

/** Nivel del semáforo de stock de un almacén intermedio. */
export const NOMBRE_INVENTARIO: Record<Exclude<NivelHolgura, 'CERRADO'>, string> = {
  ROJO: 'Stock bajo',
  AMBAR: 'Stock medio',
  VERDE: 'Stock suficiente',
};

/** Carga de una unidad sobre su capacidad: verde bajo el corte ámbar, rojo desde el corte rojo. */
export const RANGO_OCUPACION: Record<'VERDE' | 'AMBAR' | 'ROJO', string> = {
  VERDE: `< ${porcentaje(CORTE_OCUPACION.ambar)} %`,
  AMBAR: `${porcentaje(CORTE_OCUPACION.ambar)}–${porcentaje(CORTE_OCUPACION.rojo)} %`,
  ROJO: `≥ ${porcentaje(CORTE_OCUPACION.rojo)} %`,
};

/** Stock de un almacén intermedio sobre su capacidad. */
export const RANGO_INVENTARIO: Record<'VERDE' | 'AMBAR' | 'ROJO', string> = {
  VERDE: `> ${porcentaje(CORTE_INVENTARIO.ambar)} %`,
  AMBAR: `${porcentaje(CORTE_INVENTARIO.rojo)}–${porcentaje(CORTE_INVENTARIO.ambar)} %`,
  ROJO: `< ${porcentaje(CORTE_INVENTARIO.rojo)} %`,
};

/** "Regular" (36 h) o "Priorizado" (plazos menores). */
export const tipoDeEntrega = (plazoHoras: number) => (esPlazoRegular(plazoHoras) ? 'Regular' : 'Priorizado');

/** "Regular 36 h", "Priorizado 4 h". */
export const etiquetaPlazo = (plazoHoras: number) => `${tipoDeEntrega(plazoHoras)} ${plazoHoras} h`;

/**
 * Tipos de avería (TipoAveria del planificador): nombre, un ejemplo reconocible, cuánto dura y qué pasa con
 * los pedidos que la unidad lleva. La hora exacta de reincorporación la calcula el servidor.
 */
const REPLANIFICA = (varios: boolean) =>
  `${varios ? 'vuelven a planificarse con otras unidades' : 'vuelve a planificarse con otra unidad'}. La unidad se traslada al almacén central.`;

export const TIPO_AVERIA: Record<
  1 | 2 | 3,
  { nombre: string; ejemplo: string; duracion: string; impacto: (varios: boolean) => string }
> = {
  1: {
    nombre: 'Menor',
    ejemplo: 'llanta desinflada',
    duracion: '2 h detenida en el lugar',
    impacto: (varios) =>
      varios ? 'se quedan en la unidad; otra unidad en ruta puede recogerlos.' : 'se queda en la unidad; otra unidad en ruta puede recogerlo.',
  },
  2: { nombre: 'Intermedia', ejemplo: 'falla de transmisión', duracion: 'Hasta el fin del siguiente turno', impacto: REPLANIFICA },
  3: { nombre: 'Mayor', ejemplo: 'mantenimiento', duracion: '2 días o más', impacto: REPLANIFICA },
};

/** "Tipo 2 · Intermedia". */
export const nombreAveria = (tipo: 1 | 2 | 3) => `Tipo ${tipo} · ${TIPO_AVERIA[tipo].nombre}`;

/** Estado de una unidad de la flota. */
export const ESTADO_UNIDAD: Record<EstadoUnidad, string> = {
  EN_RUTA: 'En ruta',
  EN_REFRIGERIO: 'En refrigerio',
  DISPONIBLE: 'Disponible',
  FUERA_DE_TURNO: 'Fuera de turno',
  AVERIADA: 'Averiada',
};

/** Qué está haciendo una unidad; detalla el "En ruta" de ESTADO_UNIDAD. */
export const SITUACION_UNIDAD: Record<SituacionUnidad, string> = {
  A_ENTREGA: 'En ruta a entrega',
  ENTREGANDO: 'Entregando pedido',
  RETORNANDO: 'Regresando al almacén',
  A_TRASBORDO: 'En ruta a trasbordo',
  RECIBIENDO_CARGA: 'Recibiendo carga',
  EN_ESPERA: 'En espera',
  EN_ALMACEN: 'En almacén',
  EN_REFRIGERIO: 'En refrigerio',
  FUERA_DE_TURNO: 'Fuera de turno',
  AVERIADA: 'Averiada',
};

/** Pedido registrado que aún no sale a ruta (estado REGISTRADO del servidor). */
export const ESTADO_EN_ESPERA = 'En espera';
