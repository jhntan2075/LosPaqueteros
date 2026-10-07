import { useEffect, useState } from 'react';
import { formatearHora } from '../lib/formato';
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
        // El más reciente primero, como en el diseño; el último hito se resalta.
        const ordenados = [...detalle.hitos].reverse();
        setHitos(ordenados.map((h, i) => ({ hora: formatearHora(new Date(h.instanteMs)), titulo: h.titulo, detalle: h.detalle, reciente: i === 0 })));
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
