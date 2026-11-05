import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { obtenerRangos, suscribirRangos } from '../config/rangosSemaforo';
import { ErrorDeApi } from '../services/clienteApi';
import { cargarRangosSemaforo, guardarRangosSemaforo } from '../services/servicioSemaforo';
import type { RangosSemaforoApi } from '../types/api';

/** Rangos vigentes de los semáforos; el componente se vuelve a dibujar cuando el operador los cambia. */
export function useRangosSemaforo(): RangosSemaforoApi {
  return useSyncExternalStore(suscribirRangos, obtenerRangos);
}

/**
 * Carga una vez los rangos guardados en la API y suscribe al componente a sus cambios. Va en la raíz de
 * la aplicación: al cambiar los rangos se vuelve a dibujar todo, y el semáforo y la leyenda los toman.
 */
export function useRangosSemaforoGlobales(): RangosSemaforoApi {
  useEffect(() => {
    void cargarRangosSemaforo();
  }, []);
  return useRangosSemaforo();
}

export interface GuardadoRangos {
  /** Devuelve verdadero si la API aceptó los rangos. */
  guardar: (rangos: RangosSemaforoApi) => Promise<boolean>;
  enCurso: boolean;
  error: string | null;
}

/** Guarda rangos nuevos en la API; si los acepta, rigen de inmediato. */
export function useGuardarRangosSemaforo(): GuardadoRangos {
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardar = useCallback(async (rangos: RangosSemaforoApi) => {
    setEnCurso(true);
    setError(null);
    try {
      await guardarRangosSemaforo(rangos);
      return true;
    } catch (causa) {
      setError(causa instanceof ErrorDeApi ? causa.message : 'No se pudieron guardar los rangos');
      return false;
    } finally {
      setEnCurso(false);
    }
  }, []);
  return { guardar, enCurso, error };
}
