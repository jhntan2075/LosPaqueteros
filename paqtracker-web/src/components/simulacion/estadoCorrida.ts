import type { Tono } from '../ui';
import { NOMBRE_ESTADO_SIMULACION } from '../../config/glosario';
import type { EstadoCorrida } from '../../types/simulacion';

// Rótulo y estilo de cada estado de la corrida, compartidos por el encabezado y el informe. Se pintan
// con `Insignia`: el tono es la única decisión de color por estado (docs/propuesta-unificacion-ui.md §2.1).

export const ESTADO_CORRIDA: Record<EstadoCorrida, { texto: string; tono: Tono; punto?: true | 'pulso'; contorno?: boolean }> = {
  EJECUCION: { texto: NOMBRE_ESTADO_SIMULACION.EN_CURSO, tono: 'primary', punto: 'pulso' },
  COMPLETADA: { texto: NOMBRE_ESTADO_SIMULACION.COMPLETADA, tono: 'ok', punto: true },
  DETENIDA: { texto: NOMBRE_ESTADO_SIMULACION.DETENIDA, tono: 'warn', punto: true },
  COLAPSO: { texto: NOMBRE_ESTADO_SIMULACION.COLAPSADA, tono: 'critical', punto: true, contorno: true },
};
