import type { EstadoCorrida } from '../../types/simulacion';
import type { TonoEtiqueta } from '../ui/Etiqueta';

// Rótulo y tono de cada estado de la corrida, compartidos por el encabezado y el informe.

export const ESTADO_CORRIDA: Record<EstadoCorrida, { texto: string; tono: TonoEtiqueta }> = {
  EJECUCION: { texto: 'EN EJECUCIÓN', tono: 'primario' },
  COMPLETADA: { texto: 'COMPLETADA', tono: 'ok' },
  DETENIDA: { texto: 'DETENIDA', tono: 'atencion' },
  COLAPSO: { texto: 'COLAPSO DETECTADO', tono: 'critico' },
};
