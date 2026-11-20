import React from 'react';
import { etiquetaPlazo } from '../../config/glosario';
import { formatearDiaMesHora } from '../../lib/formato';
import type { PedidoEnCola } from '../../types/pedidos';
import { Insignia } from '../ui';
import { ESTADOS } from './filtrosPedidos';
import { COLOR_HOLGURA, TONO_ESTADO } from './estilos';
import { PuntoHolgura } from './iconos';

interface TarjetaPedidoProps {
  pedido: PedidoEnCola;
  /** Instante actual de la simulación: la llegada del mismo día se muestra solo con la hora. */
  referencia: Date;
  onAbrir: (codigo: string) => void;
}

/** "04/03 10:00" → "10:00" si cae el mismo día que la referencia. */
const llegadaLegible = (eta: string | null, referencia: Date) => {
  if (!eta) return '—';
  const prefijo = `${formatearDiaMesHora(referencia).slice(0, 5)} `;
  return eta.startsWith(prefijo) ? eta.slice(prefijo.length) : eta;
};

/** Pedido de la cola en celular: una tarjeta tocable de ancho completo, con lo que decide la urgencia primero. */
export const TarjetaPedido: React.FC<TarjetaPedidoProps> = ({ pedido, referencia, onAbrir }) => (
    <button
      type="button"
      aria-label={`Pedido ${pedido.codigo}`}
      onClick={() => onAbrir(pedido.codigo)}
      className="flex min-h-11 w-full cursor-pointer flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-neutral-100 focus-visible:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600/40"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-body font-semibold tabular-nums text-neutral-900">{pedido.codigo}</span>
        <span className="inline-flex items-center gap-1.5 text-body-sm font-medium tabular-nums">
          <PuntoHolgura nivel={pedido.nivelHolgura} />
          <span className={COLOR_HOLGURA[pedido.nivelHolgura]}>{pedido.holgura}</span>
        </span>
      </span>
      <span className="text-body-sm text-neutral-700">
        <span className="font-medium text-neutral-900">{pedido.cliente}</span>
        {' · '}
        <span className="tabular-nums">{pedido.cantidad} paq.</span>
        {' · '}
        <span>{etiquetaPlazo(pedido.plazoHoras)}</span>
      </span>
      <span className="flex items-center justify-between gap-3 text-body-sm text-neutral-600">
        <span className="tabular-nums">
          {pedido.vehiculo ? `Unidad ${pedido.vehiculo.codigo}` : 'Sin unidad asignada'} · llega {llegadaLegible(pedido.eta, referencia)}
        </span>
        <Insignia tono={TONO_ESTADO[pedido.estado]} punto>
          {ESTADOS[pedido.estado].etiqueta}
        </Insignia>
      </span>
    </button>
);
