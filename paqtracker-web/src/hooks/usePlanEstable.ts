import { useCallback, useEffect, useState } from 'react';
import { clienteApi, ErrorDeApi } from '../services/clienteApi';
import type { PlanEstableApi } from '../types/api';

export interface EstadoPlanEstable {
  plan: PlanEstableApi | null;
  cargando: boolean;
  /** Mensaje legible; "aún no planificó" no es un error sino un estado vacío (sinPlan). */
  error: string | null;
  /** La ejecución todavía no tiene ninguna planificación (la API responde 404). */
  sinPlan: boolean;
  /** Vuelve a pedir el plan: en Operación el plan cambia con cada Sa. */
  recargar: () => void;
}

/**
 * Última planificación estable de una ejecución (GET /api/ejecuciones/{id}/plan-estable). Se pide al montar y
 * con recargar(), no con cada instantánea: el reporte es una foto del plan, no una vista en vivo.
 */
export function usePlanEstable(ejecucionId: string): EstadoPlanEstable {
  const [plan, setPlan] = useState<PlanEstableApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinPlan, setSinPlan] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    clienteApi
      .planEstable(ejecucionId)
      .then((respuesta) => {
        if (!vigente) return;
        setPlan(respuesta);
        setSinPlan(false);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        const noHay = e instanceof ErrorDeApi && e.estado === 404;
        setSinPlan(noHay);
        setError(noHay ? null : e instanceof Error ? e.message : 'No se pudo obtener la planificación.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [ejecucionId, version]);

  const recargar = useCallback(() => {
    setCargando(true);
    setVersion((v) => v + 1);
  }, []);

  return { plan, cargando, error, sinPlan, recargar };
}
