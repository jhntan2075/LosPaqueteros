import React, { useRef, useState } from 'react';
import { AlertTriangle, ChevronRight, MoreHorizontal, Package, ScrollText, Truck, Warehouse } from 'lucide-react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import type { PestanaPanel } from '../../types/operacion';

const PESTANAS: { tipo: PestanaPanel; etiqueta: string; Icono: React.ComponentType<{ className?: string }> }[] = [
  { tipo: 'incidencias', etiqueta: 'Incidencias', Icono: AlertTriangle },
  { tipo: 'pedidos', etiqueta: 'Envíos', Icono: Package },
  { tipo: 'flota', etiqueta: 'Flota', Icono: Truck },
  { tipo: 'almacenes', etiqueta: 'Almacenes', Icono: Warehouse },
  { tipo: 'bitacora', etiqueta: 'Actividad', Icono: ScrollText },
];

/** En la barra horizontal (celular) caben cuatro pestañas y "Más"; el resto va en el menú, en el mismo orden. */
const VISIBLES_EN_HORIZONTAL = 4;

interface BarraPanelesProps {
  /** Pestaña lógicamente activa; null cuando el panel está cerrado (no se resalta ninguna). */
  activa: PestanaPanel | null;
  onSeleccionar: (tipo: PestanaPanel) => void;
  /**
   * Contador de alertas. Solo Incidencias lleva insignia: es la casa de las alertas y su número es el mismo
   * que suman las alertas del mapa. Las demás pestañas solo navegan.
   */
  alertas?: number;
  /**
   * 'vertical' (por defecto): tira a la derecha del mapa, con el panel oculto. 'horizontal': pestañas al pie,
   * para celulares. 'superior': fila de pestañas con ícono y nombre en la cabecera del bloque del panel.
   */
  orientacion?: 'vertical' | 'horizontal' | 'superior';
  /** Solo en 'superior': oculta el panel (queda la tira vertical). */
  onOcultar?: () => void;
}

const Insignia: React.FC<{ conteo: number; className: string }> = ({ conteo, className }) => (
  <span
    aria-hidden="true"
    className={`absolute min-w-4 h-4 px-1 rounded-full bg-critical-600 text-sobre-color text-caption font-semibold tabular-nums flex items-center justify-center ${className}`}
  >
    {conteo > 99 ? '99+' : conteo}
  </span>
);

const nombreAccesible = (etiqueta: string, conteo: number) =>
  conteo > 0 ? `${etiqueta}, ${conteo} ${conteo === 1 ? 'pendiente' : 'pendientes'}` : undefined;

/**
 * Barra de pestañas del panel, siempre visible: solo navega. En escritorio es vertical, junto al panel que
 * abre (cercanía entre el control y su efecto); en celular va al pie, al alcance del pulgar.
 */
export const BarraPaneles: React.FC<BarraPanelesProps> = ({ activa, onSeleccionar, alertas = 0, orientacion = 'vertical', onOcultar }) => {
  const [masAbierto, setMasAbierto] = useState(false);
  const masRef = useRef<HTMLDivElement>(null);
  useCerrarConEscape(masAbierto, () => setMasAbierto(false));
  const horizontal = orientacion === 'horizontal';
  const visibles = horizontal ? PESTANAS.slice(0, VISIBLES_EN_HORIZONTAL) : PESTANAS;
  const enMas = horizontal ? PESTANAS.slice(VISIBLES_EN_HORIZONTAL) : [];
  const masActiva = enMas.some((p) => p.tipo === activa);

  if (orientacion === 'superior') {
    return (
      <nav aria-label="Paneles del mapa" role="tablist" aria-orientation="horizontal" className="h-14 shrink-0 bg-superficie border-b border-neutral-200 flex items-stretch">
        {onOcultar && (
          <button
            type="button"
            onClick={onOcultar}
            aria-label="Ocultar panel"
            className="w-9 shrink-0 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )}
        {PESTANAS.map(({ tipo, etiqueta, Icono }) => {
          const esActiva = activa === tipo;
          const conteo = tipo === 'incidencias' ? alertas : 0;
          return (
            <button
              key={tipo}
              type="button"
              role="tab"
              aria-selected={esActiva}
              onClick={() => onSeleccionar(tipo)}
              aria-label={nombreAccesible(etiqueta, conteo)}
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-1 border-b-2 transition ${
                esActiva ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Icono className="size-[18px]" />
              <span className="font-sans text-caption leading-none truncate max-w-full px-0.5">{etiqueta}</span>
              {conteo > 0 && <Insignia conteo={conteo} className="top-1 left-1/2 ml-1.5" />}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Paneles del mapa"
      role="tablist"
      aria-orientation={orientacion}
      className={
        horizontal
          ? 'relative h-14 shrink-0 bg-superficie border-t border-neutral-200 flex items-stretch'
          : 'w-16 shrink-0 bg-superficie border-l border-neutral-200 flex flex-col items-stretch'
      }
    >
      {visibles.map(({ tipo, etiqueta, Icono }) => {
        const esActiva = activa === tipo;
        const conteo = tipo === 'incidencias' ? alertas : 0;
        return (
          <button
            key={tipo}
            type="button"
            role="tab"
            aria-selected={esActiva}
            onClick={() => onSeleccionar(tipo)}
            aria-label={nombreAccesible(etiqueta, conteo)}
            className={`relative flex flex-col items-center justify-center gap-1 transition ${
              horizontal ? 'flex-1 min-w-0 border-t-2' : 'h-14 border-l-2'
            } ${esActiva ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}`}
          >
            <Icono className="size-[18px]" />
            <span className="font-sans text-caption leading-none truncate max-w-full px-0.5">{etiqueta}</span>
            {conteo > 0 && <Insignia conteo={conteo} className={horizontal ? 'top-1 left-1/2 ml-1.5' : 'top-1.5 right-2'} />}
          </button>
        );
      })}
      {enMas.length > 0 && (
        <div ref={masRef} className="flex-1 min-w-0 flex">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={masAbierto}
            onClick={() => setMasAbierto(!masAbierto)}
            className={`w-full flex flex-col items-center justify-center gap-1 border-t-2 transition ${
              masActiva ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-transparent text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <MoreHorizontal className="size-[18px]" />
            <span className="font-sans text-caption leading-none">Más</span>
          </button>
          {masAbierto && (
            <div role="menu" className="absolute right-2 bottom-full mb-2 w-48 bg-superficie border border-neutral-200 rounded-card shadow-overlay py-1 z-30">
              {enMas.map(({ tipo, etiqueta, Icono }) => (
                <button
                  key={tipo}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMasAbierto(false);
                    onSeleccionar(tipo);
                  }}
                  className={`w-full h-11 px-3 flex items-center gap-2.5 text-body text-left hover:bg-neutral-50 ${
                    activa === tipo ? 'text-primary-600 font-medium' : 'text-neutral-900'
                  }`}
                >
                  <Icono className="size-4" />
                  {etiqueta}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
