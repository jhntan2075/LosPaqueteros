import { useEffect, useState } from 'react';
import { formatearDiaMesHora } from '../lib/formato';
import { clienteApi } from '../services/clienteApi';
import type { HitoTrazabilidad } from '../types/operacion';

// Trazabilidad de un pedido seleccionado (GET /api/pedidos/{codigo}). Se pide al abrir el detalle y de
// nuevo cuando cambia su estado (despachado, entregado), no en cada instantánea.

export function useTrazabilidadPedido(ejecucionId: string, codigo: string, estado: string): HitoTrazabilidad[] {
  const [hitos, setHitos] = useState<HitoTrazabilidad[]>([]);

  useEffect(() => {
    let vigente = true;
    clienteApi
      .detallePedido(ejecucionId, codigo)
      .then((detalle) => {
        if (!vigente) return;
        // En orden cronológico, para leer cómo ocurrió (registro → despacho → entrega); el último se resalta.
        // El orden estable conserva el del servidor entre hitos del mismo minuto.
        const ordenados = [...detalle.hitos].sort((a, b) => a.instanteMs - b.instanteMs);
        setHitos(
          ordenados.map((h, i) => ({
            hora: formatearDiaMesHora(new Date(h.instanteMs)),
            titulo: h.titulo,
            detalle: h.detalle,
            reciente: i === ordenados.length - 1,
          })),
        );
      })
      .catch(() => {
        if (vigente) setHitos([]);
      });
    return () => {
      vigente = false;
    };
  }, [ejecucionId, codigo, estado]);

  return hitos;
}
