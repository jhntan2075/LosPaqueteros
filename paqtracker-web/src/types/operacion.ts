import type { Coordenada } from './domain';
import type { IdAlmacen, TipoUnidad } from '../config/dominio';
import type { NivelHolgura } from './pedidos';
import type { EstadoEjecucionApi, IndicadoresApi, TipoEscenarioApi } from './api';

// Modelos de vista del módulo Operación (lienzo en vivo, OP-07 flota, OP-09 bitácora).

/** Subvistas de Operación en la barra lateral expandida. */
export type SubvistaOperacion = 'vivo' | 'incidencias' | 'flota' | 'bitacora';

export type EstadoUnidad = 'EN_RUTA' | 'DISPONIBLE' | 'AVERIADA';

export interface Parada {
  pedido: string; // "#1088"
  destino: Coordenada;
  eta: string;
  holgura: string;
  nivel: NivelHolgura;
}

export interface UnidadOperacion {
  codigo: string; // "A-04"
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  posicion: Coordenada;
  origen: IdAlmacen;
  carga: number;
  /** Recorrido completo desde el almacén de origen; el tramo hasta `posicion` ya se recorrió. */
  ruta: Coordenada[];
  paradas: Parada[];
  paradaActual: number; // 1-based, de `totalParadas`
  totalParadas: number;
  distanciaRecorridaKm: number;
  conductor: string;
  alimentacion: { hora: string; cumplida: boolean };
  minutosOciosa?: number;
  averia?: { tipo: 1 | 2 | 3; fueraDeServicio: string };
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
  estado: 'En tránsito' | 'Planificado' | 'Registrado';
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
  proximaEntregaMin: number;
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
