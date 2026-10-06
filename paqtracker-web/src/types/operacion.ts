import type { Coordenada } from './domain';
import type { IdAlmacen, PlazoHoras, TipoUnidad } from '../config/dominio';
import type { NivelHolgura } from './pedidos';

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
  plazoHoras: PlazoHoras;
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
