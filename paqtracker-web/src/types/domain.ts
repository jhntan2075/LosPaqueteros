// Definición de tipos de dominio alineados con el Modelo de Dominio de PaqTracker

export interface Coordenada {
  x: number;
  y: number;
}

export interface Almacen {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: Coordenada;
  capacidadMaxima: number;
  stockActual: number;
  esPrincipal: boolean;
}

export type TipoVehiculo = 'A' | 'B' | 'C';

export type EstadoVehiculo = 'DISPONIBLE' | 'EN_RUTA' | 'EN_RECARGA' | 'AVERIADO' | 'EN_MANTENIMIENTO';

export interface TramoEnCurso {
  origen: Coordenada;
  destino: Coordenada;
  tiempoSalidaSimulado: number; // timestamp o minuto simulado
  tiempoLlegadaEstimado: number; // ETA simulado
}

export interface Camion {
  id: string;
  codigo: string;
  tipo: TipoVehiculo;
  capacidadMaxima: number;
  cargaActual: number;
  velocidadKmH: number;
  estado: EstadoVehiculo;
  ubicacionActual: Coordenada;
  tramoEnCurso?: TramoEnCurso;
}

export type EstadoPedido = 'PENDIENTE' | 'ASIGNADO' | 'EN_TRANSITO' | 'ENTREGADO' | 'CANCELADO';

export interface Pedido {
  id: string;
  codigo: string;
  destino: Coordenada;
  cantidadPaquetes: number;
  horaRegistroSimulada: number;
  horaLimiteEntregaSimulada: number;
  horaEntregaRealSimulada?: number;
  estado: EstadoPedido;
  camionAsignadoId?: string;
  almacenOrigenId?: string;
}

export interface Bloqueo {
  id: string;
  tramoOrigen: Coordenada;
  tramoFin: Coordenada;
  horaInicioSimulada: number;
  horaFinSimulada: number;
  activo: boolean;
}
