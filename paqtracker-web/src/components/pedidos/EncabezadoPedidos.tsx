import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface EncabezadoPedidosProps {
  titulo: string;
  subtitulo?: string;
  onVolver: () => void;
}

/** Encabezado de las vistas de registro y confirmación de Pedidos */
export const EncabezadoPedidos: React.FC<EncabezadoPedidosProps> = ({ titulo, subtitulo, onVolver }) => (
  <header className="h-[74px] bg-white border-b border-neutral-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onVolver}
        className="size-8 rounded-lg border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition"
        title="Volver a la cola de pedidos"
        aria-label="Volver a la cola de pedidos"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex flex-col">
        <h1 className="font-sans font-semibold text-[18px] text-neutral-900 leading-tight">{titulo}</h1>
        {subtitulo && <p className="font-sans text-[12px] text-neutral-500">{subtitulo}</p>}
      </div>
    </div>
  </header>
);
