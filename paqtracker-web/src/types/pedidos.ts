import type { Coordenada } from './domain';
import type { IdAlmacen, PlazoHoras, TipoUnidad } from '../config/dominio';
import type { Fraccion } from './operacion';

// Modelos de vista del módulo Pedidos (PE-01, PE-02). Son la forma en que la UI consume los datos;
// services/servicioPedidos los produce a partir de paqtracker-api.

/** Sub-vistas del módulo: PE-02 cola, PE-01 registro y su confirmación. */
export type VistaPedidos = 'cola' | 'registrar' | 'registrado';

export type EstadoPedidoCola = 'REGISTRADO' | 'PLANIFICADO' | 'EN_TRANSITO' | 'ENTREGADO' | 'INCUMPLIDO';

/** Semáforo de holgura: > 40 % verde, 15–40 % ámbar, < 15 % rojo; CERRADO para pedidos ya resueltos. */
export type NivelHolgura = 'VERDE' | 'AMBAR' | 'ROJO' | 'CERRADO';

export interface VehiculoAsignado {
  tipo: TipoUnidad;
  codigo: string; // p. ej. "A-12"
}

export interface PedidoEnCola {
  codigo: string; // p. ej. "#1088"
  cliente: string;
  destino?: Coordenada;
  cantidad: number;
  /** Plazo en horas; los archivos de ventas pueden traer plazos fuera del catálogo de la UI. */
  plazoHoras: number;
  horaLimite: string; // "05/03 03:21"
  horaLimiteMs: number;
  eta: string | null;
  holgura: string;
  holguraMinutos: number;
  nivelHolgura: NivelHolgura;
  vehiculo: VehiculoAsignado | null;
  estado: EstadoPedidoCola;
  /** Primera salida de un almacén ("04/03 10:00"), o null si aún no sale (rúbrica E31). */
  salida: string | null;
  /** Todas las unidades que lo llevan (un pedido fraccionado va en varias), sin las liberadas por avería. */
  unidades: string[];
  /** Partes del pedido, una por unidad (sin las liberadas por avería), con su origen, horarios y estado. */
  fracciones: Fraccion[];
}

export interface BorradorPedido {
  cliente: string;
  destino: Coordenada;
  cantidad: number;
  plazoHoras: PlazoHoras;
}

export interface ResultadoReplanificacion {
  /** Verdadero si el registro disparó una planificación inmediata (CU-12). */
  replanifico: boolean;
  /** Ta de esa planificación, en milisegundos. */
  milisegundos: number;
  unidadesDespachadas: number;
}

export interface PedidoRegistrado {
  codigo: string;
  borrador: BorradorPedido;
  /** Almacén del que sale la unidad asignada; null si el pedido quedó en cola sin unidad. */
  almacenOrigen: IdAlmacen | null;
  horaLimite: Date;
  /** Unidad asignada; null si no había una libre y el pedido espera el siguiente ciclo. */
  vehiculo: VehiculoAsignado | null;
  /** Nodo donde está la unidad al momento del registro. */
  posicionVehiculo: Coordenada | null;
  eta: Date | null;
  holguraMinutos: number;
  nivelHolgura: NivelHolgura;
  replanificacion: ResultadoReplanificacion;
}
