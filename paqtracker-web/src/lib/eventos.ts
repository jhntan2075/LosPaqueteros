import { tituloGrupoEntregas, tituloGrupoPedidos, tituloGrupoReplanificaciones } from '../config/glosario';
import type { MensajeEventoApi, TipoEventoApi } from '../types/api';
import type { EventoBitacora } from '../types/operacion';

// Lista de eventos de una ejecución en el cliente: mezcla el historial cargado por REST con los eventos
// que llegan por STOMP, sin duplicados y con el más reciente primero. Igual que el servidor, usa tres
// cupos: los eventos importantes no se pierden porque los rutinarios (pedidos, replanificaciones) ni las
// alertas repetitivas (pedido tarde, stock bajo) lleguen a montones.

export const MAXIMO_IMPORTANTES = 500;
export const MAXIMO_ALERTAS = 300;
export const MAXIMO_RUTINARIOS = 300;

const IMPORTANTES: ReadonlySet<TipoEventoApi> = new Set<TipoEventoApi>([
  'ALERTA_COLAPSO',
  'UNIDAD_AVERIADA',
  'TRASBORDO',
  'UNIDAD_REINCORPORADA',
  'BLOQUEO_INICIADO',
  'BLOQUEO_LEVANTADO',
  'EJECUCION_FINALIZADA',
]);

const ALERTAS: ReadonlySet<TipoEventoApi> = new Set<TipoEventoApi>(['STOCK_BAJO', 'PEDIDO_TARDE']);

export const esEventoImportante = (evento: MensajeEventoApi): boolean => IMPORTANTES.has(evento.tipo);

/**
 * Une `actuales` con `entrantes`: sin repetir ids (gana la copia que ya estaba), el más reciente primero
 * por instante simulado y con los cupos por tipo. A igual instante, igual que el servidor, el entrante (el
 * más nuevo) va primero.
 */
export function combinarEventos(actuales: MensajeEventoApi[], entrantes: MensajeEventoApi[]): MensajeEventoApi[] {
  const vistos = new Set(actuales.map((evento) => evento.id));
  const nuevos: MensajeEventoApi[] = [];
  for (const evento of entrantes) {
    if (vistos.has(evento.id)) continue;
    vistos.add(evento.id);
    nuevos.push(evento);
  }
  // `sort` es estable: en un empate, lo que se ponga antes queda antes. Los nuevos van primero.
  const unicos = [...nuevos, ...actuales];
  unicos.sort((a, b) => b.timestampSimuladoMs - a.timestampSimuladoMs);
  let importantes = 0;
  let alertas = 0;
  let rutinarios = 0;
  return unicos.filter((evento) => {
    if (esEventoImportante(evento)) return importantes++ < MAXIMO_IMPORTANTES;
    if (ALERTAS.has(evento.tipo)) return alertas++ < MAXIMO_ALERTAS;
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
  if (clave === 'plan') return tituloGrupoReplanificaciones(n, eventos[0].hora);
  if (clave.startsWith('pedido:')) return tituloGrupoPedidos(n);
  return tituloGrupoEntregas(n);
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
    // La clave usa el miembro más antiguo (el último): un evento nuevo se suma por delante sin cerrar el grupo abierto.
    if (clave && miembros.length > 1) filas.push({ clase: 'grupo', clave: `${clave}#${miembros[miembros.length - 1].id}`, titulo: tituloDeGrupo(clave, miembros), eventos: miembros });
    else filas.push({ clase: 'evento', evento: eventos[i] });
    i = clave && miembros.length > 1 ? fin : i + 1;
  }
  return filas;
}
