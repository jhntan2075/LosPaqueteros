import React from 'react';
import { TituloGrupo } from '../ui';

// Piezas compartidas por los paneles de Operación (flota, bitácora, incidencias, detalles).

export const TituloSeccion: React.FC<{ children: React.ReactNode; derecha?: React.ReactNode }> = ({ children, derecha }) => (
  <TituloGrupo nivel={2} derecha={derecha} className="gap-3">
    {children}
  </TituloGrupo>
);

const COLOR_BARRA = {
  rojo: 'bg-critical-600',
  ambar: 'bg-warn-500',
  azul: 'bg-primary-600',
  gris: 'bg-neutral-400',
} as const;

/** Fila con barra de color a la izquierda: usada por "Requiere atención", bitácora e incidencias. */
export const FilaConBarra: React.FC<{
  color: keyof typeof COLOR_BARRA;
  titulo: string;
  detalle: React.ReactNode;
  detalleMono?: boolean;
  derecha?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ color, titulo, detalle, detalleMono = false, derecha, onClick, className = '' }) => {
  const contenido = (
    <>
      <span className={`w-1 self-stretch rounded-full shrink-0 ${COLOR_BARRA[color]}`} />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
        <span className="font-sans font-semibold text-body-sm text-neutral-900 truncate">{titulo}</span>
        <span className={`text-body-sm text-neutral-600 truncate ${detalleMono ? 'tabular-nums' : 'font-sans'}`}>{detalle}</span>
      </span>
      {derecha}
    </>
  );
  const clases = `flex items-stretch gap-2.5 ${className}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${clases} w-full hover:bg-neutral-50 transition`}>
      {contenido}
    </button>
  ) : (
    <div className={clases}>{contenido}</div>
  );
};
