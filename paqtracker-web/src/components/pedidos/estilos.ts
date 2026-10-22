import type { NivelHolgura } from '../../types/pedidos';

export const COLOR_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: 'text-critical-600',
  AMBAR: 'text-warn-700',
  VERDE: 'text-ok-600',
  CERRADO: 'text-neutral-400',
};
