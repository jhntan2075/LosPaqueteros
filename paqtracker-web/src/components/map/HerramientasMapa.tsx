import React, { useEffect, useId, useRef, useState } from 'react';
import { Eye, Info, Layers, Maximize2, SlidersHorizontal } from 'lucide-react';
import {
  AYUDA_ENFOQUE,
  etiquetaFiltros,
  HERRAMIENTA_CAPAS,
  HERRAMIENTA_ENFOQUE,
  HERRAMIENTA_LEYENDA,
  HERRAMIENTA_VER_TODO,
  DIALOGO_CAPAS,
  DIALOGO_FILTROS,
  HERRAMIENTAS_MAPA,
} from '../../config/glosario';
import type { FiltrosMapa as Filtros } from '../../lib/filtrosMapa';
import type { Capa, ModoColor } from './capas';
import { izquierdaDeLaBarra, TARJETA_FLOTANTE } from './estilosMapa';
import { SelectorCapas, SelectorColorUnidades } from './ControlesCapas';
import { FiltrosMapa, type ConteosFiltros } from './FiltrosMapa';
import { LeyendaMapa } from './LeyendaMapa';

// Barra vertical de herramientas sobre el mapa (arriba a la derecha): lo que cambia la VISTA del mapa vive en
// él. Capas, Filtros y Leyenda abren un popover anclado a su izquierda (uno a la vez); "Ver todo" encuadra la
// malla y "Modo enfoque" deja solo el mapa.

type Herramienta = 'capas' | 'filtros' | 'leyenda';

const DIALOGOS: Record<Herramienta, string> = { capas: DIALOGO_CAPAS, filtros: DIALOGO_FILTROS, leyenda: HERRAMIENTA_LEYENDA };

const ENFOCABLES = 'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ANCHO_POPOVER_PX = 320;

const BOTON = 'relative size-11 rounded-control flex items-center justify-center transition-colors';
const claseBoton = (activo: boolean) => `${BOTON} ${activo ? 'bg-primary-50 text-primary-600' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`;

export interface HerramientasMapaProps {
  capas: Record<Capa, boolean>;
  onCambiarCapa: (capa: Capa) => void;
  modoColor: ModoColor;
  onCambiarModoColor: (modo: ModoColor) => void;
  filtros: { valor: Filtros; conteos: ConteosFiltros; activos: number; onCambiar: (filtros: Filtros) => void };
  onVerTodo: () => void;
  enfoque: boolean;
  onAlternarEnfoque: () => void;
  /** Distancia (px) del borde derecho del mapa a la barra: crece si un panel flotante ocupa ese borde. */
  derechaPx: number;
  /** Alto (px) de una hoja inferior abierta (0 si no hay): los popovers se detienen 12 px sobre ella. */
  altoHojaPx: number;
  /** Mapa angosto (< 600 px): los popovers se extienden de borde a borde a la izquierda de la barra. */
  angosto: boolean;
}

export const HerramientasMapa: React.FC<HerramientasMapaProps> = ({
  capas,
  onCambiarCapa,
  modoColor,
  onCambiarModoColor,
  filtros,
  onVerTodo,
  enfoque,
  onAlternarEnfoque,
  derechaPx,
  altoHojaPx,
  angosto,
}) => {
  const [abierta, setAbierta] = useState<Herramienta | null>(null);
  const idBase = useId();
  const idPopover = (h: Herramienta) => `${idBase}-${h}`;
  const botonesRef = useRef<Partial<Record<Herramienta, HTMLButtonElement | null>>>({});
  const popoverRef = useRef<HTMLDivElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);

  // Mientras hay un popover abierto: el foco entra a su primer control; Escape lo cierra y devuelve el foco a
  // su botón; tocar fuera lo cierra sin mover el foco. Un diálogo modal encima (rangos del semáforo) cuenta
  // como "dentro": ni su Escape ni sus toques cierran el popover que lo abrió.
  useEffect(() => {
    if (!abierta) return;
    popoverRef.current?.querySelector<HTMLElement>(ENFOCABLES)?.focus({ preventScroll: true });
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      setAbierta(null);
      botonesRef.current[abierta]?.focus();
    };
    const alTocar = (evento: PointerEvent) => {
      const destino = evento.target as Element | null;
      if (!destino || popoverRef.current?.contains(destino) || botonesRef.current[abierta]?.contains(destino) || destino.closest?.('[aria-modal="true"]')) return;
      setAbierta(null);
    };
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('pointerdown', alTocar);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('pointerdown', alTocar);
    };
  }, [abierta]);

  // Barra de herramientas: las flechas arriba y abajo recorren sus botones.
  const alPresionarEnBarra = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    const botones = [...(barraRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (actual < 0) return;
    evento.preventDefault();
    botones[(actual + (evento.key === 'ArrowDown' ? 1 : botones.length - 1)) % botones.length].focus();
  };

  const alternar = (herramienta: Herramienta) => setAbierta((actual) => (actual === herramienta ? null : herramienta));
  const botonPopover = (herramienta: Herramienta, etiqueta: string, icono: React.ReactNode, insignia?: number) => (
    <button
      type="button"
      ref={(el) => {
        botonesRef.current[herramienta] = el;
      }}
      onClick={() => alternar(herramienta)}
      aria-label={etiqueta}
      title={etiqueta}
      aria-haspopup="dialog"
      aria-expanded={abierta === herramienta}
      aria-controls={abierta === herramienta ? idPopover(herramienta) : undefined}
      className={claseBoton(abierta === herramienta)}
    >
      {icono}
      {insignia !== undefined && insignia > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary-600 text-sobre-color text-caption font-semibold tabular-nums flex items-center justify-center"
        >
          {insignia}
        </span>
      )}
    </button>
  );

  // 12 px de aire arriba (top-3) y 12 px abajo, o sobre la hoja inferior si está abierta.
  const alturaMaxima = `calc(100% - ${24 + altoHojaPx}px)`;
  const derechaPopover = izquierdaDeLaBarra(derechaPx);
  const estiloPopover: React.CSSProperties = angosto
    ? { left: 12, right: derechaPopover, maxHeight: alturaMaxima }
    : { right: derechaPopover, width: ANCHO_POPOVER_PX, maxHeight: alturaMaxima };

  return (
    <>
      <div
        ref={barraRef}
        role="toolbar"
        aria-label={HERRAMIENTAS_MAPA}
        aria-orientation="vertical"
        data-sin-zoom
        onKeyDown={alPresionarEnBarra}
        className={`absolute top-3 z-10 p-1 flex flex-col gap-0.5 cursor-default ${TARJETA_FLOTANTE}`}
        style={{ right: derechaPx }}
      >
        {botonPopover('capas', HERRAMIENTA_CAPAS, <Layers className="size-5" aria-hidden="true" />)}
        {botonPopover('filtros', etiquetaFiltros(filtros.activos), <SlidersHorizontal className="size-5" aria-hidden="true" />, filtros.activos)}
        {botonPopover('leyenda', HERRAMIENTA_LEYENDA, <Info className="size-5" aria-hidden="true" />)}
        <div role="separator" className="h-px mx-1.5 my-0.5 bg-neutral-200" />
        <button type="button" onClick={onVerTodo} aria-label={HERRAMIENTA_VER_TODO} title={`${HERRAMIENTA_VER_TODO} (0)`} className={claseBoton(false)}>
          <Maximize2 className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierta(null);
            onAlternarEnfoque();
          }}
          aria-label={HERRAMIENTA_ENFOQUE}
          title={`${HERRAMIENTA_ENFOQUE}: ${AYUDA_ENFOQUE.toLowerCase()}`}
          aria-pressed={enfoque}
          className={claseBoton(enfoque)}
        >
          <Eye className="size-5" aria-hidden="true" />
        </button>
      </div>

      {abierta && (
        <div
          ref={popoverRef}
          id={idPopover(abierta)}
          role="dialog"
          aria-label={DIALOGOS[abierta]}
          data-sin-zoom
          className={`absolute top-3 z-30 p-3 overflow-y-auto cursor-default ${TARJETA_FLOTANTE}`}
          style={estiloPopover}
        >
          {abierta === 'capas' && (
            <>
              <SelectorCapas capas={capas} onCambiarCapa={onCambiarCapa} />
              <div className="mt-2 pt-3 border-t border-neutral-200">
                <SelectorColorUnidades modoColor={modoColor} onCambiarModoColor={onCambiarModoColor} />
              </div>
            </>
          )}
          {abierta === 'filtros' && <FiltrosMapa filtros={filtros.valor} conteos={filtros.conteos} onCambiar={filtros.onCambiar} />}
          {abierta === 'leyenda' && <LeyendaMapa />}
        </div>
      )}
    </>
  );
};
