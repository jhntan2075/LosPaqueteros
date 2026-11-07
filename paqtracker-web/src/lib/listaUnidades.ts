import type { UnidadOperacion } from '../types/operacion';

// Orden, búsqueda y filtro de la lista de unidades del panel (E06–E09, E11, E13–E17). Funciones puras: la
// vista solo elige el criterio. Tiempos y km de la búsqueda se miden sobre el tramo en curso: llegada a su
// destino inmediato y salida de su origen inmediato. Los km del orden son de toda la ruta en curso.

export type CriterioOrden = 'CODIGO' | 'OCUPACION' | 'SALIDA' | 'LLEGADA' | 'KM_POR_RECORRER' | 'KM_RECORRIDOS';
export type Sentido = 'ASC' | 'DESC';
/** LLEGADA: lo que falta para llegar al destino; SALIDA: lo que pasó desde que salió del origen. */
export type ReferenciaTiempo = 'LLEGADA' | 'SALIDA';
/** Magnitud de la búsqueda: minutos (E06, E07) o kilómetros (E08, E09). */
export type MagnitudBusqueda = 'MIN' | 'KM';

export const CRITERIOS_ORDEN: { valor: CriterioOrden; etiqueta: string }[] = [
  { valor: 'CODIGO', etiqueta: 'Código' },
  { valor: 'OCUPACION', etiqueta: 'Ocupación' },
  { valor: 'SALIDA', etiqueta: 'Hora de salida' },
  { valor: 'LLEGADA', etiqueta: 'Hora de llegada' },
  { valor: 'KM_POR_RECORRER', etiqueta: 'Km por recorrer' },
  { valor: 'KM_RECORRIDOS', etiqueta: 'Km recorridos' },
];

/** Rangos del filtro permanente por distancia al destino inmediato (E11): [desde, hasta[ en km. */
export const RANGOS_KM = [
  { id: '0-10', desde: 0, hasta: 10, etiqueta: '0–10 km' },
  { id: '10-20', desde: 10, hasta: 20, etiqueta: '10–20 km' },
  { id: '20-40', desde: 20, hasta: 40, etiqueta: '20–40 km' },
  { id: '40-200', desde: 40, hasta: 200, etiqueta: '40–200 km' },
] as const;
export type IdRangoKm = (typeof RANGOS_KM)[number]['id'];

const MINUTO_MS = 60_000;

/** Minutos que faltan para llegar al destino inmediato; null si no recorre un tramo. */
export const minutosParaLlegar = (u: Pick<UnidadOperacion, 'tramo'>, ahora: Date) =>
  u.tramo ? Math.max(0, (u.tramo.llegada.getTime() - ahora.getTime()) / MINUTO_MS) : null;

/** Minutos desde que salió del origen inmediato; null si no recorre un tramo. */
export const minutosDesdeSalida = (u: Pick<UnidadOperacion, 'tramo'>, ahora: Date) =>
  u.tramo ? Math.max(0, (ahora.getTime() - u.tramo.salida.getTime()) / MINUTO_MS) : null;

/** Km que faltan para llegar al destino inmediato (E08); null si no recorre un tramo. */
export const kmAlDestino = (u: Pick<UnidadOperacion, 'tramo'>) => (u.tramo ? u.tramo.kmAlDestino : null);

/** Km recorridos desde el origen inmediato (E09); null si no recorre un tramo. */
export const kmDesdeOrigen = (u: Pick<UnidadOperacion, 'tramo'>) => (u.tramo ? u.tramo.kmDesdeOrigen : null);

/** Una unidad fuera de ruta no tiene km por recorrer ni recorridos que comparar: va al final del orden. */
const enRuta = (u: Pick<UnidadOperacion, 'ruta' | 'kmPorRecorrer' | 'distanciaRecorridaKm'>) =>
  u.ruta.length > 1 || u.kmPorRecorrer > 0 || u.distanciaRecorridaKm > 0;

const ocupacion = (u: Pick<UnidadOperacion, 'carga' | 'capacidad'>) => (u.capacidad === 0 ? 0 : u.carga / u.capacidad);

const valorDe = (u: UnidadOperacion, criterio: CriterioOrden): number | null => {
  if (criterio === 'OCUPACION') return ocupacion(u);
  if (criterio === 'SALIDA') return u.tramo ? u.tramo.salida.getTime() : null;
  if (criterio === 'LLEGADA') return u.tramo ? u.tramo.llegada.getTime() : null;
  if (criterio === 'KM_POR_RECORRER') return enRuta(u) ? u.kmPorRecorrer : null;
  if (criterio === 'KM_RECORRIDOS') return enRuta(u) ? u.distanciaRecorridaKm : null;
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

/** Unidades a lo sumo a `km` de su destino inmediato (LLEGADA, E08) o de su origen inmediato (SALIDA, E09). */
export function dentroDeKm(u: UnidadOperacion, km: number, referencia: ReferenciaTiempo): boolean {
  const valor = referencia === 'LLEGADA' ? kmAlDestino(u) : kmDesdeOrigen(u);
  return valor !== null && valor <= km;
}

/** Búsqueda en la magnitud elegida (minutos o km). */
export function dentroDe(u: UnidadOperacion, limite: number, magnitud: MagnitudBusqueda, referencia: ReferenciaTiempo, ahora: Date): boolean {
  return magnitud === 'KM' ? dentroDeKm(u, limite, referencia) : dentroDeMinutos(u, limite, referencia, ahora);
}

/** Si la unidad cae en alguno de los rangos de km al destino elegidos (E11); sin rangos elegidos, todas pasan. */
export function enRangosKm(u: UnidadOperacion, rangos: ReadonlySet<IdRangoKm>): boolean {
  if (rangos.size === 0) return true;
  const km = kmAlDestino(u);
  return km !== null && RANGOS_KM.some((r) => rangos.has(r.id) && km >= r.desde && km < r.hasta);
}
