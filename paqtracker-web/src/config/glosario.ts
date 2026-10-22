import { CORTE_HOLGURA, CORTE_INVENTARIO, CORTE_OCUPACION, esPlazoRegular } from './dominio';
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

/** Pedido registrado que aún no sale a ruta (estado REGISTRADO del servidor). */
export const ESTADO_EN_ESPERA = 'En espera';
