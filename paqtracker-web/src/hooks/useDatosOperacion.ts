import { createContext, useContext, useMemo } from 'react';
import { construirDatosOperacion } from '../services/adaptadorOperacion';
import type { DatosOperacion } from '../types/operacion';
import { useEstadoEjecucion } from './useEstadoEjecucion';
import { useRelojSimulado } from './useRelojSimulado';

// Estado en vivo de la ejecución que muestra una pantalla (Operación: el día a día; Simulación: la
// corrida elegida). La pantalla lo obtiene con useEjecucionEnVivo y lo reparte por contexto, así el
// mapa, los paneles y la bitácora leen el mismo estado sin recibirlo por props.

export const ContextoDatosOperacion = createContext<DatosOperacion | null>(null);

/** Datos de la ejecución visible; solo se usa dentro de un ContextoDatosOperacion con valor. */
export function useDatosOperacion(): DatosOperacion {
  const datos = useContext(ContextoDatosOperacion);
  if (!datos) throw new Error('useDatosOperacion requiere un ContextoDatosOperacion con datos');
  return datos;
}

export interface EjecucionEnVivo {
  datos: DatosOperacion | null;
  error: string | null;
  /** Instante real (Date.now) de la última instantánea recibida; 0 si aún no llega ninguna. */
  recibidoEnMs: number;
}

/** Instantánea + tópicos STOMP de una ejecución, con el reloj y las posiciones interpolados. */
export function useEjecucionEnVivo(ejecucionId: string | null): EjecucionEnVivo {
  const { mensaje, recibidoEnMs, eventos, error } = useEstadoEjecucion(ejecucionId);
  const ahoraMs = useRelojSimulado(mensaje, recibidoEnMs);
  const datos = useMemo(
    () => (mensaje && ahoraMs !== null ? construirDatosOperacion(mensaje, ahoraMs, eventos) : null),
    [mensaje, ahoraMs, eventos],
  );
  return { datos, error, recibidoEnMs };
}
