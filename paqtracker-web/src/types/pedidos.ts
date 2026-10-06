import type { Coordenada } from './domain';
import type { IdAlmacen, PlazoHoras, TipoUnidad } from '../config/dominio';

// Modelos de vista del módulo Pedidos (PE-01, PE-02). Son la forma en que la UI
// consume los datos; el adaptador de paqtracker-api deberá producir estos mismos tipos.

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
  cantidad: number;
  plazoHoras: PlazoHoras;
  horaLimite: string; // "14:37" o "02:40 · D2"
  eta: string | null;
  holgura: string;
  nivelHolgura: NivelHolgura;
  vehiculo: VehiculoAsignado | null;
  estado: EstadoPedidoCola;
}

export interface BorradorPedido {
  cliente: string;
  destino: Coordenada;
  cantidad: number;
  plazoHoras: PlazoHoras;
}

export interface ResultadoReplanificacion {
  segundos: number;
  rutasAfectadas: number;
  pedidosEnRiesgoNuevos: number;
}

export interface PedidoRegistrado {
  codigo: string;
  borrador: BorradorPedido;
  almacenOrigen: IdAlmacen;
  horaLimite: Date;
  vehiculo: VehiculoAsignado;
  /** Nodo donde está la unidad al momento del registro, sobre su recorrido hacia el destino. */
  posicionVehiculo: Coordenada;
  eta: Date;
  holguraMinutos: number;
  nivelHolgura: NivelHolgura;
  replanificacion: ResultadoReplanificacion;
}
