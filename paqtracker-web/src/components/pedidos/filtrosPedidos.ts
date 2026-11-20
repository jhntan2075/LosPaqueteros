import { PLAZOS_HORAS, UNIDADES, type PlazoHoras, type TipoUnidad } from '../../config/dominio';
import { ESTADO_EN_ESPERA, NOMBRE_HOLGURA, RANGO_HOLGURA, etiquetaPlazo } from '../../config/glosario';
import { capitalizar } from '../../lib/formato';
import type { EstadoPedidoCola, NivelHolgura } from '../../types/pedidos';

// Filtros de la cola de pedidos, compartidos por la barra de escritorio y la hoja de celular.

export const TODOS = 'TODOS';
export const SIN_ASIGNAR = 'SIN_ASIGNAR';

export interface Filtros {
  estado: EstadoPedidoCola | typeof TODOS;
  plazo: PlazoHoras | typeof TODOS;
  vehiculo: TipoUnidad | typeof SIN_ASIGNAR | typeof TODOS;
  holgura: NivelHolgura | typeof TODOS;
}

export const SIN_FILTROS: Filtros = {
  estado: TODOS,
  plazo: TODOS,
  vehiculo: TODOS,
  holgura: TODOS,
};

export const ESTADOS: Record<EstadoPedidoCola, { etiqueta: string }> = {
  EN_TRANSITO: { etiqueta: 'En tránsito' },
  PLANIFICADO: { etiqueta: 'Planificado' },
  REGISTRADO: { etiqueta: ESTADO_EN_ESPERA },
  ENTREGADO: { etiqueta: 'Entregado' },
  INCUMPLIDO: { etiqueta: 'Incumplido' },
};

export interface OpcionFiltro {
  valor: string;
  etiqueta: string;
}

export const OPCIONES_ESTADO: OpcionFiltro[] = Object.entries(ESTADOS).map(([valor, { etiqueta }]) => ({ valor, etiqueta }));

export const OPCIONES_HOLGURA: OpcionFiltro[] = [
  { valor: 'ROJO', etiqueta: `${NOMBRE_HOLGURA.ROJO} (${RANGO_HOLGURA.ROJO})` },
  { valor: 'AMBAR', etiqueta: `${NOMBRE_HOLGURA.AMBAR} (${RANGO_HOLGURA.AMBAR})` },
  { valor: 'VERDE', etiqueta: `${NOMBRE_HOLGURA.VERDE} (${RANGO_HOLGURA.VERDE})` },
  { valor: 'CERRADO', etiqueta: NOMBRE_HOLGURA.CERRADO },
];

export const OPCIONES_PLAZO: OpcionFiltro[] = PLAZOS_HORAS.map((p) => ({ valor: String(p), etiqueta: etiquetaPlazo(p) }));

export const OPCIONES_UNIDAD: OpcionFiltro[] = [
  ...(Object.keys(UNIDADES) as TipoUnidad[]).map((t) => ({ valor: t, etiqueta: capitalizar(UNIDADES[t].nombre) })),
  { valor: SIN_ASIGNAR, etiqueta: 'Sin asignar' },
];

/** Cuántos selectores (Estado, Holgura, Plazo, Unidad) están fuera de "Todos". */
export const contarFiltrosSelector = (filtros: Filtros) => Object.values(filtros).filter((v) => v !== TODOS).length;
