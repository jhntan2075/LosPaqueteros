import type { Coordenada } from './domain';
import type { IdAlmacen, TipoUnidad } from '../config/dominio';
import type { NivelHolgura } from './pedidos';
import type { EstadoEjecucionApi, IndicadoresApi, TipoEscenarioApi } from './api';

// Modelos de vista del módulo Operación (lienzo en vivo, OP-07 flota, OP-09 bitácora).

/** Mapa de Operación: 'vivo' sin panel, o la pestaña abierta del panel lateral. */
export type SubvistaOperacion = 'vivo' | 'incidencias' | 'flota' | 'bitacora';

/**
 * Estado de una unidad, a partir de EstadoVehiculo del planificador. EN_RUTA agrupa EN_RUTA y EN_ENTREGA
 * (la unidad está haciendo su ruta); DISPONIBLE es DISPONIBLE_EN_ALMACEN.
 */
export type EstadoUnidad = 'EN_RUTA' | 'EN_REFRIGERIO' | 'DISPONIBLE' | 'FUERA_DE_TURNO' | 'AVERIADA';

/**
 * Qué está haciendo una unidad, a partir de su estado y del tramo que recorre: detalla el "en ruta" del
 * servidor (va a entregar, entrega, vuelve al almacén o espera su siguiente salida).
 */
export type SituacionUnidad =
  | 'A_ENTREGA'
  | 'ENTREGANDO'
  | 'RETORNANDO'
  | 'A_TRASBORDO'
  | 'RECIBIENDO_CARGA'
  | 'EN_ESPERA'
  | 'EN_ALMACEN'
  | 'EN_REFRIGERIO'
  | 'FUERA_DE_TURNO'
  | 'AVERIADA';

export interface Parada {
  pedido: string; // "#1088"
  destino: Coordenada;
  /** Paquetes de ese pedido que lleva esta unidad (un pedido fraccionado va en varias). */
  cantidad: number;
  /** Llegada estimada con fecha y hora: "04/03 22:30". */
  eta: string;
  holgura: string;
  nivel: NivelHolgura;
}

export interface UnidadOperacion {
  codigo: string; // "A-04"
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  situacion: SituacionUnidad;
  /** Pedido que está entregando en este momento (tramo de servicio en su destino). */
  pedidoEnEntrega?: string;
  posicion: Coordenada;
  origen: IdAlmacen;
  /** Paquetes a bordo que aún no entrega: baja con cada entrega. */
  carga: number;
  /** Capacidad de la unidad según el servidor (capacidadMaxima). */
  capacidad: number;
  /** Recorrido completo desde el almacén de origen; el tramo hasta `posicion` ya se recorrió. */
  ruta: Coordenada[];
  paradas: Parada[];
  paradaActual: number; // 1-based, de `totalParadas`
  totalParadas: number;
  distanciaRecorridaKm: number;
  conductor: string;
  alimentacion: { hora: string; cumplida: boolean };
  minutosOciosa?: number;
  /** Avería vigente, solo si la unidad está averiada. */
  averia?: AveriaUnidad;
}

export interface AveriaUnidad {
  tipo: 1 | 2 | 3;
  desde: Date;
  /** Instante simulado en que vuelve a operar. */
  vuelve: Date;
  /** Traslado al almacén central (tipos 2 y 3); null en el tipo 1. */
  trasladoCentral: Date | null;
}

export interface HitoTrazabilidad {
  hora: string;
  titulo: string;
  detalle: string;
  reciente?: boolean;
}

export interface PedidoOperacion {
  codigo: string;
  cliente: string;
  cantidad: number;
  /** Plazo de entrega en horas; los archivos de ventas pueden traer plazos fuera del catálogo de la UI. */
  plazoHoras: number;
  registrado: string;
  horaLimite: string;
  eta: string;
  holgura: string;
  holguraMinutos: number;
  nivel: NivelHolgura;
  estado: 'En espera' | 'En tránsito' | 'Entregado';
  destino: Coordenada;
  unidad: string; // código de la unidad asignada
  trazabilidad: HitoTrazabilidad[];
}

export interface BloqueoOperacion {
  id: string;
  desde: Coordenada;
  hasta: Coordenada;
  fin: string;
  rutasAfectadas: number;
}

export type CategoriaEvento = 'INCIDENCIA' | 'PLANIFICADOR' | 'ENTREGA' | 'OPERACION';

export interface EventoBitacora {
  /** Identificador único del evento (lo asigna la API). */
  id: string;
  /** Instante simulado (epoch ms) del evento. */
  instanteMs: number;
  hora: string;
  titulo: string;
  detalle: string;
  categoria: CategoriaEvento;
  color: 'rojo' | 'ambar' | 'azul' | 'gris';
}

export interface ResumenPedidos {
  total: number;
  entregados: number;
  enPlazo: number;
  fueraDePlazo: number;
  enRuta: number;
  enEspera: number;
  sinRuta: number;
  /** Minutos hasta la próxima entrega en tránsito; null si no hay ninguna en camino. */
  proximaEntregaMin: number | null;
  saturacion: number;
}

export interface AlmacenOperacion {
  id: IdAlmacen;
  stock: number | null;
  capacidad: number | null;
  /** Stock como porcentaje de la capacidad; null en el almacén central (sin tope). */
  porcentajeStock: number | null;
  nivel: NivelHolgura | null;
}

/** Estado de una ejecución listo para la vista: lo produce el adaptador a partir de la API. */
export interface DatosOperacion {
  ejecucionId: string;
  tipoEscenario: TipoEscenarioApi;
  estadoEjecucion: EstadoEjecucionApi;
  reloj: Date;
  relojInicio: Date;
  transcurridoSimuladoMs: number;
  relojRealInicio: Date | null;
  transcurridoRealMs: number;
  factorAceleracion: number;
  flota: UnidadOperacion[];
  pedidos: Record<string, PedidoOperacion>;
  bloqueos: BloqueoOperacion[];
  eventos: EventoBitacora[];
  resumen: ResumenPedidos;
  almacenes: AlmacenOperacion[];
  indicadores: IndicadoresApi;
}
