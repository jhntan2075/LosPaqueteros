import { useCallback, useEffect, useState } from 'react';
import { ErrorDeApi, clienteApi } from '../services/clienteApi';
import type { EjecucionApi, SolicitudEjecucionApi } from '../types/api';

// Ejecuciones de la API: lista para elegir cuál ver (cualquier dispositivo puede abrir cualquiera) y
// creación de simulaciones (CU-16, CU-17). La lista se recarga al pedirlo, no por polling.

export interface Ejecuciones {
  ejecuciones: EjecucionApi[];
  cargando: boolean;
  error: string | null;
  recargar: () => void;
  /** Crea la simulación y arranca su reloj; devuelve la ejecución en curso. */
  crearEIniciar: (solicitud: SolicitudEjecucionApi) => Promise<EjecucionApi>;
}

const mensajeDe = (error: unknown, porDefecto: string) => (error instanceof ErrorDeApi ? error.message : porDefecto);

export function useEjecuciones(): Ejecuciones {
  const [ejecuciones, setEjecuciones] = useState<EjecucionApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    clienteApi
      .listarEjecuciones()
      .then((lista) => {
        if (!vigente) return;
        setEjecuciones(lista);
        setError(null);
      })
      .catch((e: unknown) => {
        if (vigente) setError(mensajeDe(e, 'No se pudo obtener la lista de ejecuciones'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  const crearEIniciar = useCallback(async (solicitud: SolicitudEjecucionApi) => {
    const creada = await clienteApi.crearEjecucion(solicitud);
    const iniciada = await clienteApi.iniciar(creada.id);
    setVersion((v) => v + 1);
    return iniciada;
  }, []);

  return { ejecuciones, cargando, error, recargar, crearEIniciar };
}

export { mensajeDe as mensajeDeError };

/** Acciones sobre el reloj de una ejecución. Solo se exponen las del alcance: no hay control de velocidad. */
export function useControlEjecucion(ejecucionId: string) {
  const [error, setError] = useState<string | null>(null);
  const detener = useCallback(async () => {
    setError(null);
    try {
      await clienteApi.detener(ejecucionId);
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo detener la ejecución'));
    }
  }, [ejecucionId]);
  return { detener, error };
}
