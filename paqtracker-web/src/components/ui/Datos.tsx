import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/clases';
import { TEXTO_TONO, type Tono } from './tonos';

// Piezas para mostrar datos: título de grupo (único uso de mayúsculas), fila etiqueta/valor e
// indicador (cifra destacada).

interface TituloGrupoProps {
  /** Ícono del panel equivalente de Operación (Truck, Package, Warehouse…). */
  icono?: LucideIcon;
  /** Dato a la derecha del título (conteo, hora). */
  derecha?: React.ReactNode;
  nivel?: 2 | 3 | 4;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export const TituloGrupo: React.FC<TituloGrupoProps> = ({ icono: Icono, derecha, nivel = 3, id, className, children }) => {
  const Etiqueta = `h${nivel}` as 'h2' | 'h3' | 'h4';
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {Icono && <Icono className="size-3.5 shrink-0 text-neutral-500" aria-hidden="true" />}
      <Etiqueta id={id} className="min-w-0 truncate text-overline uppercase text-neutral-600">
        {children}
      </Etiqueta>
      {derecha && <span className="ml-auto whitespace-nowrap text-body-sm tabular-nums text-neutral-600">{derecha}</span>}
    </div>
  );
};

interface FilaDatoProps {
  etiqueta: React.ReactNode;
  valor: React.ReactNode;
  /** Color del valor (por defecto neutro). */
  tono?: Tono;
  /** Línea punteada bajo la fila, para listas de datos. */
  separador?: boolean;
  /** El valor es texto corriente (no cifra): sin dígitos tabulares. */
  texto?: boolean;
  className?: string;
}

export const FilaDato: React.FC<FilaDatoProps> = ({ etiqueta, valor, tono = 'neutral', separador = false, texto = false, className }) => (
  <div
    className={cn(
      'flex min-h-8 items-center justify-between gap-3 text-body-sm',
      separador && 'border-b border-dashed border-neutral-200 last:border-0',
      className,
    )}
  >
    <span className="text-neutral-600">{etiqueta}</span>
    <span className={cn('min-w-0 truncate text-right font-medium', !texto && 'tabular-nums', TEXTO_TONO[tono])}>{valor}</span>
  </div>
);

interface IndicadorProps {
  etiqueta: React.ReactNode;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  tono?: Tono;
  icono?: LucideIcon;
  className?: string;
}

export const Indicador: React.FC<IndicadorProps> = ({ etiqueta, valor, detalle, tono = 'neutral', icono: Icono, className }) => (
  <div className={cn('flex flex-col gap-0.5 rounded-card border border-neutral-200 bg-neutral-50 p-3', className)}>
    <span className="flex items-center gap-1.5 text-body-sm text-neutral-600">
      {Icono && <Icono className="size-3.5 shrink-0" aria-hidden="true" />}
      {etiqueta}
    </span>
    <span className={cn('text-kpi tabular-nums', TEXTO_TONO[tono])}>{valor}</span>
    {detalle && <span className="text-caption text-neutral-600">{detalle}</span>}
  </div>
);
