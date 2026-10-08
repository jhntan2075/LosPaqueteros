import React from 'react';
import { ArrowLeft, PackageCheck } from 'lucide-react';

interface EncabezadoPedidosProps {
  titulo: string;
  subtitulo?: string;
  onVolver: () => void;
}

/** Encabezado de las vistas de detalle de Pedidos (PE-01) */
export const EncabezadoPedidos: React.FC<EncabezadoPedidosProps> = ({ titulo, subtitulo, onVolver }) => (
  <header className="h-[74px] bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 shadow-2xs">
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onVolver}
        className="size-8 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition"
        title="Volver a la cola de pedidos"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex flex-col">
        <h1 className="font-sans font-semibold text-[18px] text-[#0F172A] leading-tight">{titulo}</h1>
        {subtitulo && <p className="font-sans text-[12px] text-[#64748B]">{subtitulo}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-sans font-medium bg-blue-50 text-[#1E40AF] border border-blue-200">
        <PackageCheck className="w-3.5 h-3.5" />
        Gestión de Pedidos
      </span>
    </div>
  </header>
);
