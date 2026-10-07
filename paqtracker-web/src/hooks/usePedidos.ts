import { useEffect, useMemo, useState } from 'react';
import { ErrorDeApi } from '../services/clienteApi';
import { obtenerPedidos, ordenarCola } from '../services/servicioPedidos';
import type { PedidoApi } from '../types/api';
import type { PedidoEnCola } from '../types/pedidos';
import { useDatosOperacion } from './useDatosOperacion';

// Cola de pedidos de la ejecución visible (CU-04). No hay polling: se vuelve a pedir cuando la
// instantánea que llega por STOMP indica que cambió algún pedido (registrados, en tránsito o entregados).

export interface ColaPedidos {
  pedidos: PedidoEnCola[];
  total: number;
  /** Clientes conocidos, para autocompletar el registro. */
  clientes: string[];
  cargando: boolean;
  error: string | null;
}

export function useColaPedidos(): ColaPedidos {
  const { ejecucionId, indicadores, reloj } = useDatosOperacion();
  const [crudos, setCrudos] = useState<PedidoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const version = [
    indicadores.pedidosRegistrados,
    indicadores.pedidosEnTransito,
    indicadores.pedidosEntregadosATiempo + indicadores.pedidosEntregadosConRetraso,
  ].join('-');

  useEffect(() => {
    let vigente = true;
    obtenerPedidos(ejecucionId)
      .then((pedidos) => {
        if (!vigente) return;
        setCrudos(pedidos);
        setError(null);
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof ErrorDeApi ? e.message : 'No se pudo cargar la cola');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [ejecucionId, version]);

  const pedidos = useMemo(() => ordenarCola(crudos, reloj), [crudos, reloj]);
  const clientes = useMemo(
    () => [...new Set(crudos.map((p) => p.cliente).filter((c): c is string => c !== null))].sort(),
    [crudos],
  );
  return { pedidos, total: crudos.length, clientes, cargando, error };
}
