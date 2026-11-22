import type { MensajeEventoApi, TipoEventoApi } from '../types/api';
import type { EventoBitacora } from '../types/operacion';

// Lista de eventos de una ejecución en el cliente: mezcla el historial cargado por REST con los eventos
// que llegan por STOMP, sin duplicados y con el más reciente primero. Igual que el servidor, usa dos
// cupos: los eventos importantes no se pierden porque los rutinarios (pedidos, replanificaciones)
// lleguen a montones.

export const MAXIMO_IMPORTANTES = 500;
export const MAXIMO_RUTINARIOS = 300;

const IMPORTANTES: ReadonlySet<TipoEventoApi> = new Set<TipoEventoApi>([
  'ALERTA_COLAPSO',
  'UNIDAD_AVERIADA',
  'TRASBORDO',
  'UNIDAD_REINCORPORADA',
  'BLOQUEO_INICIADO',
  'BLOQUEO_LEVANTADO',
  'STOCK_BAJO',
  'PEDIDO_TARDE',
  'EJECUCION_FINALIZADA',
]);

export const esEventoImportante = (evento: MensajeEventoApi): boolean => IMPORTANTES.has(evento.tipo);

/**
 * Une `actuales` con `entrantes`: sin repetir ids (gana la copia que ya estaba), el más reciente primero
 * por instante simulado y con los cupos por tipo. A igual instante conserva el orden de llegada.
 */
export function combinarEventos(actuales: MensajeEventoApi[], entrantes: MensajeEventoApi[]): MensajeEventoApi[] {
  const vistos = new Set<string>();
  const unicos: MensajeEventoApi[] = [];
  for (const evento of [...actuales, ...entrantes]) {
    if (vistos.has(evento.id)) continue;
    vistos.add(evento.id);
    unicos.push(evento);
  }
  unicos.sort((a, b) => b.timestampSimuladoMs - a.timestampSimuladoMs);
  let importantes = 0;
  let rutinarios = 0;
  return unicos.filter((evento) => {
    if (esEventoImportante(evento)) return importantes++ < MAXIMO_IMPORTANTES;
    return rutinarios++ < MAXIMO_RUTINARIOS;
  });
}

/** Fila de la lista de actividad: un evento suelto o un grupo de eventos rutinarios consecutivos. */
export type FilaActividad =
  | { clase: 'evento'; evento: EventoBitacora }
  | { clase: 'grupo'; clave: string; titulo: string; eventos: EventoBitacora[] };

const MS_MINUTO = 60_000;

/** Clave de agrupación de un evento rutinario; null si no se agrupa. Las entregas con retraso se dejan sueltas. */
function claveDeGrupo(evento: EventoBitacora): string | null {
  const minuto = Math.floor(evento.instanteMs / MS_MINUTO);
  if (evento.tipo === 'PLAN_ACTUALIZADO') return 'plan';
  if (evento.tipo === 'NUEVO_PEDIDO') return `pedido:${minuto}`;
  if (evento.tipo === 'PEDIDO_ENTREGADO' && evento.color !== 'rojo') return `entrega:${minuto}`;
  return null;
}

function tituloDeGrupo(clave: string, eventos: EventoBitacora[]): string {
  const n = eventos.length;
  if (clave === 'plan') return `${n} replanificaciones · última ${eventos[0].hora}`;
  if (clave.startsWith('pedido:')) return `+${n} pedidos registrados`;
  return `${n} entregas`;
}

/**
 * Agrupa solo para mostrar (los datos no cambian): replanificaciones consecutivas, y pedidos registrados o
 * entregas consecutivos dentro del mismo minuto simulado. Un grupo de uno se muestra como evento normal.
 * `eventos` viene con el más reciente primero.
 */
export function agruparActividad(eventos: EventoBitacora[]): FilaActividad[] {
  const filas: FilaActividad[] = [];
  let i = 0;
  while (i < eventos.length) {
    const clave = claveDeGrupo(eventos[i]);
    let fin = i + 1;
    if (clave) while (fin < eventos.length && claveDeGrupo(eventos[fin]) === clave) fin++;
    const miembros = eventos.slice(i, fin);
    if (clave && miembros.length > 1) filas.push({ clase: 'grupo', clave: `${clave}#${miembros[0].id}`, titulo: tituloDeGrupo(clave, miembros), eventos: miembros });
    else filas.push({ clase: 'evento', evento: eventos[i] });
    i = clave && miembros.length > 1 ? fin : i + 1;
  }
  return filas;
}
