import { createContext, useContext } from 'react';

// Aviso no bloqueante (snackbar) que confirma una acción con efecto. Lo muestra ProveedorAvisos.

export interface Aviso {
  texto: string;
  /** "exito" (por defecto) confirma una acción; "error" informa que no se pudo hacer. */
  tipo?: 'exito' | 'error';
  /** Acción opcional, p. ej. "Ver en bitácora". */
  accion?: { etiqueta: string; alHacer: () => void };
}

export const ContextoAvisos = createContext<(aviso: Aviso) => void>(() => {});

/** Muestra un aviso; fuera de un ProveedorAvisos no hace nada. */
export const useAvisos = () => useContext(ContextoAvisos);
