import { createContext, useContext } from 'react';
import type { RespuestaRegistroAveriaApi } from '../types/api';
import type { DatosOperacion } from '../types/operacion';

// CU-13 Registrar avería. La API responde 202 y la programa para el siguiente minuto que procesa el motor
// (instanteMs): hasta entonces la unidad no figura averiada, y en el día a día, con reloj real, eso puede
// tardar unos minutos. ProveedorAverias recuerda el registro para mostrarla "aplicándose" mientras tanto;
// vive en un proveedor para sobrevivir a que se cierre el panel o se cambie de pestaña.

/** Margen simulado tras el instante programado: si para entonces no figura averiada, deja de mostrarse. */
const MARGEN_PENDIENTE_MS = 5 * 60_000;

export interface ContextoAveriasValor {
  /** Averías registradas que el servidor aún no aplica, por "ejecucionId:unidad". */
  pendientes: Record<string, RespuestaRegistroAveriaApi>;
  /** Registra la avería; si falla, lanza un Error con el mensaje para el operador. */
  registrar: (ejecucionId: string, unidad: string, tipo: 1 | 2 | 3) => Promise<RespuestaRegistroAveriaApi>;
  /** Deshace la avería programada de la unidad; si ya se aplicó o falla, lanza un Error con el mensaje. */
  cancelar: (ejecucionId: string, unidad: string) => Promise<void>;
}

export const ContextoAverias = createContext<ContextoAveriasValor | null>(null);

export const claveAveria = (ejecucionId: string, unidad: string) => `${ejecucionId}:${unidad}`;

export function useAverias(): ContextoAveriasValor {
  const contexto = useContext(ContextoAverias);
  if (!contexto) throw new Error('useAverias requiere un ProveedorAverias');
  return contexto;
}

/** Avería registrada que el servidor aún no aplica a la unidad (todavía no figura averiada); si no, null. */
export function averiaPendiente(
  datos: DatosOperacion,
  pendientes: ContextoAveriasValor['pendientes'],
  unidad: string,
): RespuestaRegistroAveriaApi | null {
  const pendiente = pendientes[claveAveria(datos.ejecucionId, unidad)];
  const actual = datos.flota.find((u) => u.codigo === unidad);
  if (!pendiente || !actual || actual.estado === 'AVERIADA') return null;
  return datos.reloj.getTime() <= pendiente.instanteMs + MARGEN_PENDIENTE_MS ? pendiente : null;
}

export function useAveriaPendiente(datos: DatosOperacion, unidad: string): RespuestaRegistroAveriaApi | null {
  return averiaPendiente(datos, useAverias().pendientes, unidad);
}

/** Si la ejecución admite registrar averías y, si no, el motivo para mostrarlo junto al botón. */
export function admisionDeAverias(datos: DatosOperacion): { admite: boolean; motivo?: string } {
  if (datos.tipoEscenario === 'COLAPSO_LOGISTICO') {
    return { admite: false, motivo: 'Esta simulación no admite averías.' };
  }
  if (datos.estadoEjecucion !== 'EN_CURSO' && datos.estadoEjecucion !== 'PAUSADA') {
    return { admite: false, motivo: 'La ejecución terminó: no admite averías.' };
  }
  return { admite: true };
}
