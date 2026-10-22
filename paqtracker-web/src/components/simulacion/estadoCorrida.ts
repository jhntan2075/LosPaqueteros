import type { EstadoCorrida } from '../../types/simulacion';

// Rótulo y estilo de cada estado de la corrida, compartidos por el encabezado y el informe.

export const ESTADO_CORRIDA: Record<EstadoCorrida, { texto: string; clase: string; punto: string }> = {
  EJECUCION: { texto: 'EN EJECUCIÓN', clase: 'bg-primary-100 text-primary-600', punto: 'bg-primary-600 animate-pulse' },
  COMPLETADA: { texto: 'COMPLETADA', clase: 'bg-ok-50 text-ok-700', punto: 'bg-ok-600' },
  DETENIDA: { texto: 'DETENIDA', clase: 'bg-warn-50 text-warn-700', punto: 'bg-warn-500' },
  COLAPSO: { texto: 'COLAPSO DETECTADO', clase: 'border border-critical-600 text-critical-600', punto: 'bg-critical-600' },
};
