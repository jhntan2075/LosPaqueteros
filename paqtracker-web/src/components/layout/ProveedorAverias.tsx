import React, { useCallback, useState } from 'react';
import { ContextoAverias, claveAveria } from '../../hooks/useAverias';
import { ErrorDeApi, clienteApi } from '../../services/clienteApi';
import type { RespuestaRegistroAveriaApi } from '../../types/api';

/** Mensaje para el operador según la respuesta de la API (404, 409, red). */
function mensajeDeError(error: unknown, unidad: string): string {
  if (!(error instanceof ErrorDeApi) || error.estado === 0) {
    return 'No se pudo registrar la avería. Revisa la conexión e inténtalo de nuevo.';
  }
  if (error.estado === 404) return `No se encontró la unidad ${unidad} en esta ejecución.`;
  if (error.estado === 409) {
    if (/averiada/i.test(error.message)) return `${unidad} ya está averiada.`;
    if (/colapso/i.test(error.message)) return 'Esta simulación no admite averías.';
    return 'La ejecución terminó: no admite averías.';
  }
  return 'No se pudo registrar la avería. Inténtalo de nuevo.';
}

export const ProveedorAverias: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendientes, setPendientes] = useState<Record<string, RespuestaRegistroAveriaApi>>({});

  const registrar = useCallback(async (ejecucionId: string, unidad: string, tipo: 1 | 2 | 3) => {
    let respuesta: RespuestaRegistroAveriaApi;
    try {
      respuesta = await clienteApi.registrarAveria(ejecucionId, unidad, tipo);
    } catch (error) {
      throw new Error(mensajeDeError(error, unidad));
    }
    // useAveriaPendiente decide con el reloj de la ejecución cuándo deja de estar "aplicándose".
    setPendientes((previos) => ({ ...previos, [claveAveria(ejecucionId, unidad)]: respuesta }));
    return respuesta;
  }, []);

  const cancelar = useCallback(
    async (ejecucionId: string, unidad: string) => {
      const clave = claveAveria(ejecucionId, unidad);
      const pendiente = pendientes[clave];
      if (!pendiente) throw new Error(`La avería de ${unidad} ya se aplicó: no se puede deshacer.`);
      try {
        await clienteApi.cancelarAveria(ejecucionId, pendiente.id);
      } catch (error) {
        if (error instanceof ErrorDeApi && error.estado === 409) {
          throw new Error(`La avería de ${unidad} ya se aplicó: no se puede deshacer.`);
        }
        throw new Error('No se pudo deshacer la avería. Revisa la conexión e inténtalo de nuevo.');
      }
      setPendientes(({ [clave]: _cancelada, ...resto }) => resto);
    },
    [pendientes],
  );

  return <ContextoAverias.Provider value={{ pendientes, registrar, cancelar }}>{children}</ContextoAverias.Provider>;
};
