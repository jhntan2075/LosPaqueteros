import type { NivelHolgura } from '../../types/pedidos';

export const COLOR_HOLGURA: Record<NivelHolgura, string> = {
  ROJO: 'text-[#B91C1C]',
  AMBAR: 'text-[#B45309]',
  VERDE: 'text-[#15803D]',
  CERRADO: 'text-[#94A3B8]',
};

export const FONDO_NIVEL: Record<NivelHolgura, string> = {
  ROJO: 'bg-[#B91C1C]',
  AMBAR: 'bg-[#B45309]',
  VERDE: 'bg-[#15803D]',
  CERRADO: 'bg-[#94A3B8]',
};
