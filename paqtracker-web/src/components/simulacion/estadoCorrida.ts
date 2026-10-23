import type { EstadoCorrida } from '../../types/simulacion';

// Rótulo y estilo de cada estado de la corrida, compartidos por el encabezado y el informe.

export const ESTADO_CORRIDA: Record<EstadoCorrida, { texto: string; clase: string; punto: string }> = {
  EJECUCION: { texto: 'EN EJECUCIÓN', clase: 'bg-[#DBEAFE] text-[#1E40AF]', punto: 'bg-[#1E40AF] animate-pulse' },
  COMPLETADA: { texto: 'COMPLETADA', clase: 'bg-[#DCFCE7] text-[#15803D]', punto: 'bg-[#15803D]' },
  DETENIDA: { texto: 'DETENIDA', clase: 'bg-[#FEF3E5] text-[#B45309]', punto: 'bg-[#B45309]' },
  COLAPSO: { texto: 'COLAPSO DETECTADO', clase: 'border border-[#B91C1C] text-[#B91C1C]', punto: 'bg-[#B91C1C]' },
};
