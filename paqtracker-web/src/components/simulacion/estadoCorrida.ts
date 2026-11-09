import type { Tono } from '../ui';
import type { EstadoCorrida } from '../../types/simulacion';

// Rótulo y estilo de cada estado de la corrida, compartidos por el encabezado y el informe. Se pintan
// con `Insignia`: el tono es la única decisión de color por estado (docs/propuesta-unificacion-ui.md §2.1).

export const ESTADO_CORRIDA: Record<EstadoCorrida, { texto: string; tono: Tono; punto?: true | 'pulso'; contorno?: boolean }> = {
  EJECUCION: { texto: 'En ejecución', tono: 'primary', punto: 'pulso' },
  COMPLETADA: { texto: 'Completada', tono: 'ok', punto: true },
  DETENIDA: { texto: 'Detenida', tono: 'warn', punto: true },
  COLAPSO: { texto: 'Colapso detectado', tono: 'critical', punto: true, contorno: true },
};
