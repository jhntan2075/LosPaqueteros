import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { ACERCAR, ALEJAR, AYUDA_ACERCAR, AYUDA_ALEJAR, ZOOM } from '../../config/glosario';
import { TARJETA_FLOTANTE } from './estilosMapa';

// Zoom del mapa (abajo a la derecha) y su barra de escala (abajo a la izquierda). El zoom no va en pantallas
// angostas, donde se acerca con pellizco; "Ver todo" vive en la barra de herramientas.

/** Longitudes "redondas" para la barra de escala; se elige la que mide entre 40 y 120 px. */
const LARGOS_ESCALA_KM = [1, 2, 5, 10, 20, 50];
const barraEscala = (pxPorKm: number) => {
  const km = LARGOS_ESCALA_KM.find((largo) => largo * pxPorKm >= 40) ?? LARGOS_ESCALA_KM[LARGOS_ESCALA_KM.length - 1];
  return { km, px: Math.round(km * pxPorKm) };
};

const BOTON_ZOOM = 'size-11 flex items-center justify-center rounded-control text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer';

interface ControlesZoomProps {
  /** Zoom actual como porcentaje de la vista completa. */
  porcentaje: number;
  alejarDeshabilitado: boolean;
  onAcercar: () => void;
  onAlejar: () => void;
  /** Distancia (px) a los bordes derecho e inferior del mapa. */
  derechaPx: number;
  inferiorPx: number;
}

export const ControlesZoom: React.FC<ControlesZoomProps> = ({ porcentaje, alejarDeshabilitado, onAcercar, onAlejar, derechaPx, inferiorPx }) => (
  <div
    role="group"
    aria-label={ZOOM}
    data-sin-zoom
    className={`absolute z-10 flex flex-col p-0.5 cursor-default ${TARJETA_FLOTANTE}`}
    style={{ right: derechaPx, bottom: inferiorPx }}
  >
    <button type="button" onClick={onAcercar} className={BOTON_ZOOM} title={AYUDA_ACERCAR} aria-label={ACERCAR}>
      <ZoomIn className="size-5" aria-hidden="true" />
    </button>
    <button
      type="button"
      onClick={onAlejar}
      disabled={alejarDeshabilitado}
      className={`${BOTON_ZOOM} border-t border-neutral-200 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent`}
      title={AYUDA_ALEJAR}
      aria-label={ALEJAR}
    >
      <ZoomOut className="size-5" aria-hidden="true" />
    </button>
    <span className="text-caption tabular-nums text-center text-neutral-600 font-semibold block border-t border-neutral-200 py-1">{porcentaje}%</span>
  </div>
);

interface BarraEscalaProps {
  /** Píxeles por kilómetro de la vista actual. */
  pxPorKm: number;
  /** Con el cursor sobre el mapa, la coordenada del nodo (convención de los visores de mapas). */
  nodo: { x: number; y: number } | null;
  /** Distancia (px) al borde inferior del mapa: sube si una hoja inferior está abierta. */
  inferiorPx: number;
}

export const BarraEscala: React.FC<BarraEscalaProps> = ({ pxPorKm, nodo, inferiorPx }) => {
  const escala = barraEscala(pxPorKm);
  return (
    <div className="absolute left-3 z-10 flex items-end gap-2 pointer-events-none" style={{ bottom: inferiorPx }}>
      <div className="bg-superficie/95 px-2.5 py-1 rounded-control border border-neutral-200 shadow-xs flex flex-col gap-0.5">
        <span className="tabular-nums text-caption text-neutral-600">{escala.km} km</span>
        <span className="block h-1.5 border-x-2 border-b-2 border-neutral-600" style={{ width: escala.px }} />
      </div>
      {nodo && (
        <span className="bg-superficie/95 px-2.5 py-1 rounded-control border border-neutral-200 shadow-xs text-caption tabular-nums text-neutral-600">
          nodo <span className="font-medium text-neutral-900">({nodo.x},{nodo.y})</span>
        </span>
      )}
    </div>
  );
};
