import React from 'react';
import { AlertTriangle, BarChart3, Package, ScrollText, Truck, Warehouse } from 'lucide-react';
import type { PestanaPanel } from '../../types/operacion';

const PESTANAS: { tipo: PestanaPanel; etiqueta: string; Icono: React.ComponentType<{ className?: string }> }[] = [
  { tipo: 'resumen', etiqueta: 'Resumen', Icono: BarChart3 },
  { tipo: 'incidencias', etiqueta: 'Incidencias', Icono: AlertTriangle },
  { tipo: 'pedidos', etiqueta: 'Pedidos', Icono: Package },
  { tipo: 'flota', etiqueta: 'Flota', Icono: Truck },
  { tipo: 'almacenes', etiqueta: 'Almacenes', Icono: Warehouse },
  { tipo: 'bitacora', etiqueta: 'Bitácora', Icono: ScrollText },
];

interface BarraPanelesProps {
  /** Pestaña lógicamente activa; null cuando el panel está cerrado (no se resalta ninguna). */
  activa: PestanaPanel | null;
  onSeleccionar: (tipo: PestanaPanel) => void;
  /** Contador de alerta por pestaña; 0 o ausente no muestra insignia. */
  conteos?: Partial<Record<PestanaPanel, number>>;
}

/**
 * Barra vertical fija a la derecha del mapa, siempre visible (reemplaza los accesos flotantes que
 * desaparecían al abrir el panel): abre o cambia la pestaña del panel lateral.
 */
export const BarraPaneles: React.FC<BarraPanelesProps> = ({ activa, onSeleccionar, conteos = {} }) => (
  <nav
    aria-label="Paneles del mapa"
    role="tablist"
    aria-orientation="vertical"
    className="w-[64px] shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col items-stretch"
  >
    {PESTANAS.map(({ tipo, etiqueta, Icono }) => {
      const esActiva = activa === tipo;
      const conteo = conteos[tipo];
      return (
        <button
          key={tipo}
          type="button"
          role="tab"
          aria-selected={esActiva}
          onClick={() => onSeleccionar(tipo)}
          aria-label={conteo && conteo > 0 ? `${etiqueta}, ${conteo} ${conteo === 1 ? 'pendiente' : 'pendientes'}` : undefined}
          className={`relative h-[56px] flex flex-col items-center justify-center gap-[3px] border-l-[3px] transition ${
            esActiva ? 'border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]' : 'border-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
          }`}
        >
          <Icono className="w-[18px] h-[18px]" />
          <span className="font-sans text-[10px] leading-none">{etiqueta}</span>
          {conteo !== undefined && conteo > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-[6px] right-[8px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-[#B91C1C] text-white text-[10px] font-semibold tabular-nums flex items-center justify-center"
            >
              {conteo > 99 ? '99+' : conteo}
            </span>
          )}
        </button>
      );
    })}
  </nav>
);
