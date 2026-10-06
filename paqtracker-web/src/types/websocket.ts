import type { Almacen, Camion, Pedido, Bloqueo } from './domain';
import type { IndicadoresOperacion } from './ejecucion';

// Mensaje difundido en /topic/ejecuciones/{id}/estado en cada salto Sc (DA-04, 6.2)
export interface MensajeEstadoSimulacion {
  ejecucionId: string;
  pasoSc: number;
  relojSimuladoMs: number;
  relojSimuladoFormateado: string;
  relojRealFormateado: string;
  unidades: Camion[];
  almacenes: Almacen[];
  indicadores: IndicadoresOperacion;
}

// Tipo de eventos difundidos en /topic/ejecuciones/{id}/eventos
export type TipoEventoSimulacion = 
  | 'PLAN_ACTUALIZADO'
  | 'NUEVO_PEDIDO'
  | 'PEDIDO_ENTREGADO'
  | 'BLOQUEO_INICIADO'
  | 'BLOQUEO_LEVANTADO'
  | 'AVERIA_REGISTRADA'
  | 'ALERTA_COLAPSO';

export interface EventoSimulacion {
  id: string;
  ejecucionId: string;
  tipo: TipoEventoSimulacion;
  mensaje: string;
  timestampSimuladoMs: number;
  detalle?: {
    pedido?: Pedido;
    camion?: Camion;
    bloqueo?: Bloqueo;
    metadata?: Record<string, unknown>;
  };
}
