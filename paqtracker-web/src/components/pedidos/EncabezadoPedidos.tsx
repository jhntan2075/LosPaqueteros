import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Boton } from '../ui/Boton';

interface EncabezadoPedidosProps {
  titulo: string;
  subtitulo?: string;
  onVolver: () => void;
}

/** Encabezado de las vistas de registro y confirmación de Pedidos */
export const EncabezadoPedidos: React.FC<EncabezadoPedidosProps> = ({ titulo, subtitulo, onVolver }) => (
  <header className="h-[74px] bg-white border-b border-neutral-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
    <div className="flex items-center gap-4">
      <Boton variante="secundario" tamano="sm" className="size-8 px-0"
        onClick={onVolver}
        title="Volver a la cola de pedidos"
        aria-label="Volver a la cola de pedidos"
      >
        <ArrowLeft className="w-4 h-4" />
      </Boton>
      <div className="flex flex-col">
        <h1 className="font-sans font-semibold text-title text-neutral-900 leading-tight">{titulo}</h1>
        {subtitulo && <p className="font-sans text-body text-neutral-500">{subtitulo}</p>}
      </div>
    </div>
  </header>
);
