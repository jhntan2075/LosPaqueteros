import type { Tono } from '../ui';
import { COLOR_SEMAFORO } from '../../lib/semaforo';
import type { EstadoPedidoCola, NivelHolgura } from '../../types/pedidos';

/** Color del texto de la holgura (tokens de la paleta). Lo usan Pedidos y Simulación. */
export const COLOR_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: 'text-critical-600',
  AMBAR: 'text-warn-700',
  VERDE: 'text-ok-700',
  CERRADO: 'text-neutral-500',
};

/** Color del pin de destino en los minimapas: el mismo semáforo que en el mapa de Operación. */
export const COLOR_PIN_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: COLOR_SEMAFORO.ROJO,
  AMBAR: COLOR_SEMAFORO.AMBAR,
  VERDE: COLOR_SEMAFORO.VERDE,
  CERRADO: COLOR_SEMAFORO.VACIO,
};

/** Tono de la insignia de cada estado del pedido, igual en la cola, el detalle y la confirmación. */
export const TONO_ESTADO: Record<EstadoPedidoCola, Tono> = {
  EN_TRANSITO: 'primary',
  PLANIFICADO: 'info',
  REGISTRADO: 'neutral',
  ENTREGADO: 'ok',
  INCUMPLIDO: 'critical',
};
