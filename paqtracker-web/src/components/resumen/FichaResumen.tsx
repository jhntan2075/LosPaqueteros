import React from 'react';
import { ArrowRight } from 'lucide-react';

// Ficha de una cifra del resumen: título, valor y dos líneas de contexto. Con `onClick` es un botón que lleva
// al detalle de esa cifra.

interface FichaResumenProps {
  titulo: string;
  valor: React.ReactNode;
  linea1: string;
  linea2: string;
  onClick?: () => void;
  esAlerta?: boolean;
}

export const FichaResumen: React.FC<FichaResumenProps> = ({ titulo, valor, linea1, linea2, onClick, esAlerta }) => {
  const contenido = (
    <>
      <div className="flex items-center justify-between w-full">
        <span className="font-sans text-caption font-medium text-neutral-600 tracking-tight truncate">{titulo}</span>
        {onClick && <ArrowRight className="size-3 text-neutral-600 group-hover:text-primary-600 transition shrink-0" aria-hidden="true" />}
      </div>
      <span className="flex items-center gap-1.5 tabular-nums text-title text-neutral-900">{valor}</span>
      <span className="font-sans text-caption text-neutral-600 truncate w-full">{linea1}</span>
      <span className="font-sans text-caption text-neutral-600 truncate w-full">{linea2}</span>
    </>
  );
  const base = 'w-full bg-superficie border rounded-card px-2.5 py-2 flex flex-col gap-0.5 items-start text-left overflow-hidden transition';
  const borde = esAlerta ? 'border-critical-600/25 bg-critical-50/40' : 'border-neutral-200';
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`group ${base} ${borde} min-h-11 hover:border-primary-600 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-primary-600/30 cursor-pointer`}
    >
      {contenido}
    </button>
  ) : (
    <div className={`${base} ${borde}`}>{contenido}</div>
  );
};
