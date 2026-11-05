import type { UnidadOperacion } from '../types/operacion';

// Orden y búsqueda de la lista de unidades del panel (E06, E07, E13–E15). Funciones puras: la vista solo
// elige el criterio. Los tiempos se miden sobre el tramo en curso: llegada a su destino inmediato y salida
// de su origen inmediato.

export type CriterioOrden = 'CODIGO' | 'OCUPACION' | 'SALIDA' | 'LLEGADA';
export type Sentido = 'ASC' | 'DESC';
/** LLEGADA: minutos que faltan para llegar al destino; SALIDA: minutos desde que salió del origen. */
export type ReferenciaTiempo = 'LLEGADA' | 'SALIDA';

export const CRITERIOS_ORDEN: { valor: CriterioOrden; etiqueta: string }[] = [
  { valor: 'CODIGO', etiqueta: 'Código' },
  { valor: 'OCUPACION', etiqueta: 'Ocupación' },
  { valor: 'SALIDA', etiqueta: 'Hora de salida' },
  { valor: 'LLEGADA', etiqueta: 'Hora de llegada' },
];

const MINUTO_MS = 60_000;

/** Minutos que faltan para llegar al destino inmediato; null si no recorre un tramo. */
export const minutosParaLlegar = (u: Pick<UnidadOperacion, 'tramo'>, ahora: Date) =>
  u.tramo ? Math.max(0, (u.tramo.llegada.getTime() - ahora.getTime()) / MINUTO_MS) : null;

/** Minutos desde que salió del origen inmediato; null si no recorre un tramo. */
export const minutosDesdeSalida = (u: Pick<UnidadOperacion, 'tramo'>, ahora: Date) =>
  u.tramo ? Math.max(0, (ahora.getTime() - u.tramo.salida.getTime()) / MINUTO_MS) : null;

const ocupacion = (u: Pick<UnidadOperacion, 'carga' | 'capacidad'>) => (u.capacidad === 0 ? 0 : u.carga / u.capacidad);

const valorDe = (u: UnidadOperacion, criterio: CriterioOrden): number | null => {
  if (criterio === 'OCUPACION') return ocupacion(u);
  if (criterio === 'SALIDA') return u.tramo ? u.tramo.salida.getTime() : null;
  if (criterio === 'LLEGADA') return u.tramo ? u.tramo.llegada.getTime() : null;
  return null;
};

/**
 * Ordena sin modificar la lista. Las unidades sin dato para el criterio (sin tramo en curso) van siempre
 * al final, en cualquier sentido; los empates se resuelven por código.
 */
export function ordenarUnidades(unidades: UnidadOperacion[], criterio: CriterioOrden, sentido: Sentido): UnidadOperacion[] {
  const signo = sentido === 'ASC' ? 1 : -1;
  return [...unidades].sort((a, b) => {
    if (criterio === 'CODIGO') return signo * a.codigo.localeCompare(b.codigo);
    const va = valorDe(a, criterio);
    const vb = valorDe(b, criterio);
    if (va === null || vb === null) return va === vb ? a.codigo.localeCompare(b.codigo) : va === null ? 1 : -1;
    return signo * (va - vb) || a.codigo.localeCompare(b.codigo);
  });
}

/** Unidades a lo sumo a `minutos` de llegar a su destino (LLEGADA) o desde su salida del origen (SALIDA). */
export function dentroDeMinutos(u: UnidadOperacion, minutos: number, referencia: ReferenciaTiempo, ahora: Date): boolean {
  const valor = referencia === 'LLEGADA' ? minutosParaLlegar(u, ahora) : minutosDesdeSalida(u, ahora);
  return valor !== null && valor <= minutos;
}
