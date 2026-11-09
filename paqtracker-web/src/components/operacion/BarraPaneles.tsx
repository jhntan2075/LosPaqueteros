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
    className="w-16 shrink-0 bg-white border-l border-neutral-200 flex flex-col items-stretch"
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
          className={`relative h-14 flex flex-col items-center justify-center gap-1 border-l-2 transition ${
            esActiva ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          }`}
        >
          <Icono className="size-[18px]" />
          <span className="font-sans text-caption leading-none">{etiqueta}</span>
          {conteo !== undefined && conteo > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-2 min-w-4 h-4 px-1 rounded-full bg-critical-600 text-white text-caption font-semibold tabular-nums flex items-center justify-center"
            >
              {conteo > 99 ? '99+' : conteo}
            </span>
          )}
        </button>
      );
    })}
  </nav>
);
