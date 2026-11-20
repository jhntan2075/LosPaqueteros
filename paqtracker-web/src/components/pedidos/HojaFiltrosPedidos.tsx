import React, { useRef } from 'react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import type { PlazoHoras } from '../../config/dominio';
import { Boton, Selector } from '../ui';
import {
  OPCIONES_ESTADO,
  OPCIONES_HOLGURA,
  OPCIONES_PLAZO,
  OPCIONES_UNIDAD,
  TODOS,
  type Filtros,
  type OpcionFiltro,
} from './filtrosPedidos';

interface HojaFiltrosPedidosProps {
  abierta: boolean;
  filtros: Filtros;
  /** Cantidad de pedidos visibles con los filtros actuales. */
  visibles: number;
  onCambiar: (filtros: Filtros) => void;
  onCerrar: () => void;
}

const CampoFiltro: React.FC<{ etiqueta: string; valor: string; opciones: OpcionFiltro[]; onCambiar: (valor: string) => void }> = ({
  etiqueta,
  valor,
  opciones,
  onCambiar,
}) => (
  <label className="flex flex-col gap-1 text-body-sm font-medium text-neutral-700">
    {etiqueta}
    <Selector tamano="lg" value={valor} onChange={(e) => onCambiar(e.target.value)} className="min-h-11 font-normal">
      <option value={TODOS}>Todos</option>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.etiqueta}
        </option>
      ))}
    </Selector>
  </label>
);

const Hoja: React.FC<Omit<HojaFiltrosPedidosProps, 'abierta'>> = ({ filtros, visibles, onCambiar, onCerrar }) => {
  const hojaRef = useRef<HTMLDivElement>(null);
  useFocoAtrapado(hojaRef);
  useCerrarConEscape(true, onCerrar);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      <div className="absolute inset-0 bg-velo/40" onClick={onCerrar} aria-hidden="true" />
      <div
        ref={hojaRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros de pedidos"
        className="relative flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-card bg-superficie p-4 shadow-overlay"
      >
        <h2 className="text-title text-neutral-900">Filtros</h2>
        <CampoFiltro
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={OPCIONES_ESTADO}
          onCambiar={(v) => onCambiar({ ...filtros, estado: v as Filtros['estado'] })}
        />
        <CampoFiltro
          etiqueta="Holgura"
          valor={filtros.holgura}
          opciones={OPCIONES_HOLGURA}
          onCambiar={(v) => onCambiar({ ...filtros, holgura: v as Filtros['holgura'] })}
        />
        <CampoFiltro
          etiqueta="Plazo"
          valor={String(filtros.plazo)}
          opciones={OPCIONES_PLAZO}
          onCambiar={(v) => onCambiar({ ...filtros, plazo: v === TODOS ? TODOS : (Number(v) as PlazoHoras) })}
        />
        <CampoFiltro
          etiqueta="Unidad"
          valor={filtros.vehiculo}
          opciones={OPCIONES_UNIDAD}
          onCambiar={(v) => onCambiar({ ...filtros, vehiculo: v as Filtros['vehiculo'] })}
        />
        <Boton variante="primario" tamano="lg" onClick={onCerrar} className="min-h-11 w-full">
          Ver {visibles} {visibles === 1 ? 'pedido' : 'pedidos'}
        </Boton>
      </div>
    </div>
  );
};

/** Hoja inferior modal con los filtros de la cola en celular; los selectores aplican de inmediato. */
export const HojaFiltrosPedidos: React.FC<HojaFiltrosPedidosProps> = ({ abierta, ...resto }) => (abierta ? <Hoja {...resto} /> : null);
