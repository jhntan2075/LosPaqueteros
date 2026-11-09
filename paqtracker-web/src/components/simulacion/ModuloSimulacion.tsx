import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useParametroUrl } from '../../hooks/useParametroUrl';
import { mensajeDeError } from '../../hooks/useEjecuciones';
import { clienteApi } from '../../services/clienteApi';
import type { EjecucionApi } from '../../types/api';
import { Aviso, Boton, Tarjeta } from '../ui';
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
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <Tarjeta className="w-full max-w-md" cuerpoClassName="flex flex-col items-center gap-3 px-6 py-6 text-center">
          <p className="text-title-sm text-neutral-900">Abrir simulación</p>
          {errorActual ? (
            <>
              <Aviso tono="critical" compacto role="alert">
                {errorActual}
              </Aviso>
              <Boton variante="secundario" tamano="sm" icono={ArrowLeft} onClick={salir}>
                Ver otras simulaciones
              </Boton>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 text-body-sm text-neutral-600">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary-600 motion-safe:animate-pulse" />
              Abriendo…
            </p>
          )}
        </Tarjeta>
      </div>
    );
  }

  if (!ejecucion) {
    return <ConfiguracionEscenario onAbrir={abrir} />;
  }
  return <CorridaSimulacion key={ejecucion.id} ejecucion={ejecucion} onSalir={salir} />;
};
