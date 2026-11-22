import React from 'react';
import type { PestanaPanel } from '../../types/operacion';
import { BarraPaneles } from './BarraPaneles';

/** Ancho del bloque derecho abierto (px): cabe la fila de seis pestañas con ícono y nombre. */
export const ANCHO_BLOQUE_PX = 420;

interface BloqueDerechoProps {
  /** Pestaña activa del panel. */
  activa: PestanaPanel | null;
  onSeleccionar: (tipo: PestanaPanel) => void;
  /** Contador de alertas de la pestaña Incidencias. */
  alertas?: number;
  /** Oculta el panel: queda solo la tira vertical de pestañas. */
  onOcultar: () => void;
  /** El panel de detalle (PanelLateral con presentacion="bloque"). */
  children: React.ReactNode;
}

/**
 * Lado derecho de Operación y de la simulación, en escritorio, como un solo bloque a todo el alto: la fila de
 * pestañas arriba y el panel debajo. El mapa ocupa el resto del ancho (no queda tapado por el panel). Con el
 * panel oculto, el bloque se reemplaza por la tira vertical de pestañas (BarraPaneles).
 */
export const BloqueDerecho: React.FC<BloqueDerechoProps> = ({ activa, onSeleccionar, alertas = 0, onOcultar, children }) => (
  <section
    aria-label="Bloque derecho"
    style={{ width: ANCHO_BLOQUE_PX }}
    className="shrink-0 min-h-0 flex flex-col bg-superficie border-l border-neutral-200"
  >
    <BarraPaneles activa={activa} onSeleccionar={onSeleccionar} alertas={alertas} orientacion="superior" onOcultar={onOcultar} />
    {children}
  </section>
);
