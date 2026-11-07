import type { IdAlmacen } from '../config/dominio';
import type { DatosOperacion, Fraccion, PedidoOperacion, PestanaLista, PestanaPanel, SeleccionPanel } from '../types/operacion';

// Selectores de pedidos y fracciones para el panel (rúbrica 91.EvaSw E20–E22, E31, F01–F03, F05). Funciones
// puras sobre DatosOperacion: la vista solo elige qué mostrar y las memoriza con useMemo.

const MS_POR_MINUTO = 60_000;

/** Ventana de las listas "por salir" y "entregados" del almacén: 4 h del reloj simulado. */
export const VENTANA_PANEL_HORAS = 4;
export const VENTANA_PANEL_MS = VENTANA_PANEL_HORAS * 60 * MS_POR_MINUTO;

/** Pedido de un código de fracción: "P-00042·2" → "P-00042". */
export const pedidoDeFraccion = (codigoFraccion: string) => codigoFraccion.split('·')[0];

/**
 * Pedidos conocidos: los activos de la instantánea y los entregados en las últimas 4 h. Un pedido que
 * acaba de entregarse puede aparecer en ambos mientras llega la instantánea siguiente: manda el activo.
 */
export function pedidosConocidos(datos: Pick<DatosOperacion, 'pedidos' | 'entregadosRecientes'>): PedidoOperacion[] {
  const activos = Object.values(datos.pedidos);
  const codigos = new Set(activos.map((p) => p.codigo));
  return [...activos, ...datos.entregadosRecientes.filter((p) => !codigos.has(p.codigo))];
}

/** Busca un pedido entre los activos y los entregados recientes. */
export const buscarPedido = (datos: Pick<DatosOperacion, 'pedidos' | 'entregadosRecientes'>, codigo: string) =>
  datos.pedidos[codigo] ?? datos.entregadosRecientes.find((p) => p.codigo === codigo);

const todasLasFracciones = (datos: Pick<DatosOperacion, 'pedidos' | 'entregadosRecientes'>) =>
  pedidosConocidos(datos).flatMap((p) => p.fracciones);

/** Fracciones que salieron del almacén y aún no se entregan (E20). Las que llegan antes, primero. */
export function enCaminoDesde(datos: Pick<DatosOperacion, 'pedidos' | 'entregadosRecientes'>, almacen: IdAlmacen): Fraccion[] {
  return todasLasFracciones(datos)
    .filter((f) => f.origen === almacen && f.estado === 'EN_CAMINO')
    .sort((a, b) => a.llegada.getTime() - b.llegada.getTime() || a.codigo.localeCompare(b.codigo));
}

/**
 * Fracciones que salen del almacén en las próximas 4 h (E21): ya despachadas por el planificador, con una
 * salida en (ahora, ahora + 4 h]. Las que salen antes, primero.
 */
export function porSalirDesde(
  datos: Pick<DatosOperacion, 'pedidos' | 'entregadosRecientes'>,
  almacen: IdAlmacen,
  ahora: Date,
): Fraccion[] {
  const desde = ahora.getTime();
  const hasta = desde + VENTANA_PANEL_MS;
  return todasLasFracciones(datos)
    .filter((f) => f.origen === almacen && f.estado === 'PROGRAMADA' && f.salida.getTime() > desde && f.salida.getTime() <= hasta)
    .sort((a, b) => a.salida.getTime() - b.salida.getTime() || a.codigo.localeCompare(b.codigo));
}

/**
 * Fracciones que salieron del almacén y se entregaron en las últimas 4 h (E22), con el borde inferior
 * incluido. Las más recientes, primero.
 */
export function entregadasDesde(
  datos: Pick<DatosOperacion, 'pedidos' | 'entregadosRecientes'>,
  almacen: IdAlmacen,
  ahora: Date,
): Fraccion[] {
  const hasta = ahora.getTime();
  const desde = hasta - VENTANA_PANEL_MS;
  return todasLasFracciones(datos)
    .filter((f) => f.origen === almacen && f.estado === 'ENTREGADA' && f.llegada.getTime() >= desde && f.llegada.getTime() <= hasta)
    .sort((a, b) => b.llegada.getTime() - a.llegada.getTime() || a.codigo.localeCompare(b.codigo));
}

export interface ResumenEnviosAlmacen {
  enCamino: Fraccion[];
  porSalir: Fraccion[];
  entregadas: Fraccion[];
}

/** Las tres listas del almacén en una sola pasada de la vista. */
export const enviosDeAlmacen = (
  datos: Pick<DatosOperacion, 'pedidos' | 'entregadosRecientes'>,
  almacen: IdAlmacen,
  ahora: Date,
): ResumenEnviosAlmacen => ({
  enCamino: enCaminoDesde(datos, almacen),
  porSalir: porSalirDesde(datos, almacen, ahora),
  entregadas: entregadasDesde(datos, almacen, ahora),
});

/** Paquetes de una lista de fracciones. */
export const paquetes = (fracciones: Fraccion[]) => fracciones.reduce((total, f) => total + f.cantidad, 0);

// --- Lista de pedidos del panel (E31) ------------------------------------------------------------

/**
 * Filtros de la lista de pedidos. Los dos últimos son ventanas del reloj simulado (rúbrica E32 y E33): los
 * entregados en las últimas 4 h y los que se entregan en las próximas 4 h según su llegada estimada.
 */
export type FiltroPedidos = 'TODOS' | 'EN_CAMINO' | 'EN_ESPERA' | 'POR_ENTREGAR_4H' | 'ENTREGADOS_4H';
export type OrdenPedidos = 'HORA_LIMITE' | 'LLEGADA' | 'SALIDA';

/** Fracciones que siguen contando para el pedido: las liberadas por una avería quedan solo en su historia. */
export const fraccionesVigentes = (pedido: PedidoOperacion) => pedido.fracciones.filter((f) => f.estado !== 'LIBERADA');

/** Primera salida de un pedido; null si aún no sale ninguna fracción. */
export function salidaDePedido(pedido: PedidoOperacion): Date | null {
  const salidas = fraccionesVigentes(pedido).map((f) => f.salida.getTime());
  return salidas.length === 0 ? null : new Date(Math.min(...salidas));
}

/** Llegada del pedido: la de su última fracción (estimada, o real si ya se entregó); null si espera. */
export function llegadaDePedido(pedido: PedidoOperacion): Date | null {
  if (pedido.entrega) return pedido.entrega;
  const llegadas = fraccionesVigentes(pedido).map((f) => f.llegada.getTime());
  return llegadas.length === 0 ? null : new Date(Math.max(...llegadas));
}

const PASA_FILTRO: Record<FiltroPedidos, (p: PedidoOperacion, ahoraMs: number) => boolean> = {
  TODOS: () => true,
  EN_CAMINO: (p) => p.estado === 'En tránsito',
  EN_ESPERA: (p) => p.estado === 'En espera',
  POR_ENTREGAR_4H: (p, ahoraMs) => {
    const llegada = p.estado === 'Entregado' ? null : llegadaDePedido(p);
    return llegada !== null && llegada.getTime() > ahoraMs && llegada.getTime() <= ahoraMs + VENTANA_PANEL_MS;
  },
  ENTREGADOS_4H: (p, ahoraMs) =>
    p.entrega !== null && p.entrega.getTime() <= ahoraMs && p.entrega.getTime() >= ahoraMs - VENTANA_PANEL_MS,
};

/** Texto de búsqueda que coincide con el pedido, el cliente o cualquiera de sus unidades. */
const coincide = (p: PedidoOperacion, termino: string) => {
  const t = termino.trim().toLowerCase();
  if (t === '') return true;
  return [p.codigo, p.cliente, ...p.fracciones.map((f) => f.unidad)].some((texto) => texto.toLowerCase().includes(t));
};

const valorOrden = (p: PedidoOperacion, orden: OrdenPedidos): number | null => {
  if (orden === 'HORA_LIMITE') return p.horaLimiteFecha.getTime();
  const fecha = orden === 'LLEGADA' ? llegadaDePedido(p) : salidaDePedido(p);
  return fecha ? fecha.getTime() : null;
};

/**
 * Filtra, busca y ordena sin modificar la lista. Los pedidos sin dato para el criterio (aún sin salir) van al
 * final; los empates se resuelven por código, así las filas no saltan entre instantáneas.
 */
export function listarPedidos(
  pedidos: PedidoOperacion[],
  filtro: FiltroPedidos,
  termino: string,
  orden: OrdenPedidos,
  ahora: Date,
): PedidoOperacion[] {
  return pedidos
    .filter((p) => PASA_FILTRO[filtro](p, ahora.getTime()) && coincide(p, termino))
    .sort((a, b) => {
      const va = valorOrden(a, orden);
      const vb = valorOrden(b, orden);
      if (va === null || vb === null) return va === vb ? a.codigo.localeCompare(b.codigo) : va === null ? 1 : -1;
      return va - vb || a.codigo.localeCompare(b.codigo);
    });
}

// --- Selección compartida entre el mapa y las listas (F01, F02, F03, F05) ---------------------------

/** Selección que el mapa puede resaltar: un pedido, una de sus fracciones, una unidad o un almacén. */
export type SeleccionResaltable = Extract<SeleccionPanel, { tipo: 'pedido' | 'fraccion' | 'vehiculo' | 'almacen' }>;

export const esResaltable = (s: SeleccionPanel | null): s is SeleccionResaltable =>
  s !== null && (s.tipo === 'pedido' || s.tipo === 'fraccion' || s.tipo === 'vehiculo' || s.tipo === 'almacen');

/**
 * Unidades cuyas rutas resalta el mapa: la unidad elegida; todas las que llevan el pedido elegido (F03,
 * puede ir fraccionado), o solo la de la fracción elegida (F02).
 */
export function unidadesResaltadas(seleccion: SeleccionPanel | null, destinos: { pedido: string; unidad: string }[]): Set<string> {
  if (seleccion?.tipo === 'vehiculo') return new Set([seleccion.codigo]);
  if (seleccion?.tipo === 'fraccion') return new Set([seleccion.unidad]);
  if (seleccion?.tipo === 'pedido') return new Set(destinos.filter((d) => d.pedido === seleccion.codigo).map((d) => d.unidad));
  return new Set();
}

/** Si el pin de un destino corresponde a la selección: el pedido entero, o solo la parada de la fracción. */
export function destinoResaltado(seleccion: SeleccionPanel | null, destino: { pedido: string; unidad: string }): boolean {
  if (seleccion?.tipo === 'pedido') return seleccion.codigo === destino.pedido;
  if (seleccion?.tipo === 'fraccion') return seleccion.pedido === destino.pedido && seleccion.unidad === destino.unidad;
  return false;
}

/** Pestaña-lista donde vive cada tipo de objeto del mapa. */
const LISTA_DE: Partial<Record<SeleccionResaltable['tipo'], PestanaLista>> = {
  pedido: 'pedidos',
  vehiculo: 'flota',
  almacen: 'almacenes',
};

/**
 * Qué hace un clic en un objeto del mapa (F01, F05). Si el panel muestra la lista de ese tipo de objeto, se
 * resalta su fila y la lista se queda; en cualquier otro caso se abre su detalle, como siempre.
 */
export function accionAlElegirEnMapa(
  objeto: SeleccionResaltable,
  panel: { detalleAbierto: boolean; pestana: PestanaPanel | null },
): 'resaltar' | 'abrir' {
  return !panel.detalleAbierto && panel.pestana !== null && LISTA_DE[objeto.tipo] === panel.pestana ? 'resaltar' : 'abrir';
}

/** Minutos entre dos fechas, redondeados (positivo si `hasta` es posterior). */
export const minutosEntre = (desde: Date, hasta: Date) => Math.round((hasta.getTime() - desde.getTime()) / MS_POR_MINUTO);
