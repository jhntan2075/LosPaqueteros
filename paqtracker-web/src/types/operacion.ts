import type { Coordenada } from './domain';
import type { IdAlmacen, TipoUnidad } from '../config/dominio';
import type { NivelCarga } from '../lib/semaforo';
import type { NivelHolgura } from './pedidos';
import type { EstadoEjecucionApi, EstadoFraccionApi, IndicadoresApi, TipoEscenarioApi } from './api';

// Modelos de vista del módulo Operación (lienzo en vivo, OP-07 flota, OP-09 bitácora).

/** Mapa de Operación: 'vivo' sin panel, o la pestaña abierta del panel lateral. */
export type SubvistaOperacion = 'vivo' | 'resumen' | 'incidencias' | 'pedidos' | 'flota' | 'almacenes' | 'bitacora';

/** Pestaña del panel lateral, tal como las muestra la barra vertical de paneles. */
export type PestanaPanel = Exclude<SubvistaOperacion, 'vivo'>;

/** Qué muestra el panel lateral del mapa: una de sus pestañas, o el detalle de un objeto. */
export type SeleccionPanel =
  | { tipo: 'resumen' }
  | { tipo: 'incidencias' }
  | { tipo: 'pedidos' }
  | { tipo: 'flota' }
  | { tipo: 'almacenes' }
  | { tipo: 'bitacora' }
  | { tipo: 'pedido'; codigo: string }
  /** Una fracción del pedido: la parte que lleva una sola unidad (el "producto" de la rúbrica). */
  | { tipo: 'fraccion'; codigo: string; pedido: string; unidad: string }
  | { tipo: 'vehiculo'; codigo: string }
  | { tipo: 'almacen'; codigo: string };

/** Pestañas que son listas: al elegir en el mapa un objeto de su tipo, se resalta su fila en vez de abrir el detalle. */
export type PestanaLista = Extract<PestanaPanel, 'pedidos' | 'flota' | 'almacenes'>;

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
  /** Tramo que recorre ahora (viaje, servicio, retorno…); sin valor si está detenida en un almacén. */
  tramo?: TramoUnidad;
}

export interface TramoUnidad {
  origen: Coordenada;
  /** Destino inmediato: el final del tramo en curso. */
  destino: Coordenada;
  salida: Date;
  llegada: Date;
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

export type EstadoFraccion = EstadoFraccionApi;

/** Parte de un pedido que lleva una sola unidad (FraccionEnvio de la API). */
export interface Fraccion {
  /** Código visible: el del pedido y su correlativo, "P-00042·2". */
  codigo: string;
  pedido: string;
  indice: number;
  unidad: string;
  origen: IdAlmacen;
  cantidad: number;
  salida: Date;
  /** Llegada estimada, o real si ya se entregó. */
  llegada: Date;
  /** PROGRAMADA y EN_CAMINO se recalculan con el reloj interpolado del cliente. */
  estado: EstadoFraccion;
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
  /** Hora límite y entrega real como fechas, para las ventanas de tiempo del panel. */
  horaLimiteFecha: Date;
  entrega: Date | null;
  /** Partes del pedido por unidad, en el orden en que salieron; vacío si aún no sale. */
  fracciones: Fraccion[];
}

export interface BloqueoOperacion {
  id: string;
  /** Id del bloqueo en la API: varios tramos de una misma polilínea comparten el mismo valor. */
  idOriginal: number;
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
  /** Semáforo + vacío de ocupación (rojo = lleno); null en el central. */
  nivelStock: NivelCarga | null;
  /** Alerta de stock bajo calculada por la API (LE-078): true bajo su corte rojo. */
  stockBajo: boolean;
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
  /** Pedidos entregados en las últimas 4 h simuladas (no están en `pedidos`, que solo trae los activos). */
  entregadosRecientes: PedidoOperacion[];
}
