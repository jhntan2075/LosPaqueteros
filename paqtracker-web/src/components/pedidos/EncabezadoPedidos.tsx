import React from 'react';
import { RelojOperacion } from '../layout/RelojOperacion';

interface EncabezadoPedidosProps {
  titulo: string;
  onVolver: () => void;
}

/** Encabezado de 80 px de las vistas de detalle de Pedidos (PE-01). */
export const EncabezadoPedidos: React.FC<EncabezadoPedidosProps> = ({ titulo, onVolver }) => (
  <header className="h-[80px] bg-white border-b border-[#E2E8F0] pl-[24px] pr-[25px] flex items-center justify-between shrink-0">
    <div className="flex flex-col gap-[4px] self-start pt-[16px] leading-[normal]">
      <button
        type="button"
        onClick={onVolver}
        className="self-start font-sans font-medium text-[12px] text-[#1E40AF] whitespace-pre hover:underline"
      >
        {'‹  Volver a pedidos'}
      </button>
      <h1 className="font-sans font-semibold text-[22px] leading-[normal] text-[#0F172A]">{titulo}</h1>
    </div>
    <RelojOperacion />
  </header>
);
