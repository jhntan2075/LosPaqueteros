import React, { useEffect, useState } from 'react';
import { useParametroUrl } from '../../hooks/useParametroUrl';
import { mensajeDeError } from '../../hooks/useEjecuciones';
import { clienteApi } from '../../services/clienteApi';
import type { EjecucionApi } from '../../types/api';
import { ConfiguracionEscenario } from './ConfiguracionEscenario';
import { CorridaSimulacion } from './CorridaSimulacion';

// Flujo de Simulación: configuración de escenario (o elegir una existente) → corrida → informe.
// La corrida abierta se refleja en la URL (?tab=simulacion&ejecucion=<id>): el enlace se puede
// compartir o recargar y abre esa misma corrida directamente, sin pasar por la lista — "cualquier
// dispositivo puede ver cualquier corrida" vale también para quien todavía no tiene la pestaña abierta.

export const ModuloSimulacion: React.FC = () => {
  const [ejecucionId, fijarEjecucionId] = useParametroUrl('ejecucion');
  const [ejecucion, setEjecucion] = useState<EjecucionApi | null>(null);
  // El error queda con el id al que corresponde: así no hace falta limpiarlo a mano al cambiar de id,
  // solo se muestra mientras sigue siendo el que está en la URL (ver `errorActual` más abajo).
  const [error, setError] = useState<{ id: string; mensaje: string } | null>(null);

  // La URL trae un id que el estado local todavía no tiene: llegada directa al enlace, o recarga de
  // la página con una corrida abierta. Se busca una sola vez por id (si cambia a otro, se busca de nuevo).
  useEffect(() => {
    if (!ejecucionId || ejecucion?.id === ejecucionId) return;
    let vigente = true;
    clienteApi
      .consultarEjecucion(ejecucionId)
      .then((encontrada) => {
        if (vigente) setEjecucion(encontrada);
      })
      .catch((e: unknown) => {
        if (vigente) setError({ id: ejecucionId, mensaje: mensajeDeError(e, 'No se pudo abrir esta simulación') });
      });
    return () => {
      vigente = false;
    };
  }, [ejecucionId, ejecucion?.id]);

  const errorActual = error?.id === ejecucionId ? error.mensaje : null;

  const abrir = (nueva: EjecucionApi) => {
    setEjecucion(nueva);
    fijarEjecucionId(nueva.id, { empujar: true });
  };
  const salir = () => {
    setEjecucion(null);
    fijarEjecucionId(null, { empujar: true });
  };

  // Hay un id en la URL (se pidió abrir esa corrida) pero el estado local todavía no la tiene.
  if (ejecucionId && !ejecucion) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
        <div className="bg-white border border-[#E2E8F0] rounded-[10px] px-[28px] py-[22px] flex flex-col items-center gap-[10px] max-w-[440px] text-center">
          <p className="font-sans font-semibold text-[14px] text-[#0F172A]">Abrir simulación</p>
          {errorActual ? (
            <>
              <p className="font-sans text-[12px] text-[#B91C1C]">{errorActual}</p>
              <button type="button" onClick={salir} className="font-sans font-medium text-[12px] text-[#1E40AF] hover:underline">
                Ver otras simulaciones
              </button>
            </>
          ) : (
            <p className="font-sans text-[12px] text-[#64748B] flex items-center justify-center gap-[8px]">
              <span className="size-[6px] rounded-full bg-[#1E40AF] animate-pulse" /> Abriendo…
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!ejecucion) {
    return <ConfiguracionEscenario onAbrir={abrir} />;
  }
  return <CorridaSimulacion key={ejecucion.id} ejecucion={ejecucion} onSalir={salir} />;
};
