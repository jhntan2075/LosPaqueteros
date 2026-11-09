import React from 'react';
import { cn } from '../../lib/clases';
import { NOMBRE_HOLGURA, RANGO_HOLGURA } from '../../config/glosario';
import type { NivelHolgura } from '../../types/pedidos';
import { COLOR_HOLGURA } from './estilos';
import { PuntoHolgura } from './iconos';

// Recuadro de holgura del detalle de un pedido: el mismo en el panel de Operación y en el detalle de Pedidos.

const BORDE_NIVEL: Record<NivelHolgura, string> = {
  ROJO: 'border-critical-600',
  AMBAR: 'border-warn-500',
  VERDE: 'border-ok-600',
  CERRADO: 'border-neutral-300',
};

interface RecuadroHolguraProps {
  nivel: NivelHolgura;
  /** Holgura ya formateada ("02:57"). */
  holgura: string;
  holguraMinutos: number;
  plazoHoras: number;
  className?: string;
}

export const RecuadroHolgura: React.FC<RecuadroHolguraProps> = ({ nivel, holgura, holguraMinutos, plazoHoras, className }) => {
  const fraccion = holguraMinutos / (plazoHoras * 60);
  return (
    <div className={cn('border rounded-control px-3 py-2 flex items-center justify-between', BORDE_NIVEL[nivel], className)}>
      <div className="flex flex-col">
        <span className="flex items-center gap-2 font-sans text-body-sm text-neutral-600">
          <PuntoHolgura nivel={nivel} /> holgura restante
        </span>
        <span className={`tabular-nums text-kpi ${COLOR_HOLGURA[nivel]}`}>{holgura}</span>
      </div>
      <div className="flex flex-col items-end text-body-sm">
        <span className={`tabular-nums ${COLOR_HOLGURA[nivel]}`}>{Math.round(fraccion * 100)} % del plazo total</span>
        <span className="font-sans text-neutral-600">
          {NOMBRE_HOLGURA[nivel]}
          {nivel !== 'CERRADO' && ` · ${RANGO_HOLGURA[nivel]}`}
        </span>
      </div>
    </div>
  );
};
