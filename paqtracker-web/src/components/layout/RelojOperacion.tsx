import React from 'react';

export const RelojOperacion: React.FC<{ relojSimulado: string }> = ({ relojSimulado }) => (
  <div className="h-[78px] flex flex-col justify-center gap-1.5 flex-shrink-0 pr-3">
    <span className="text-[#64748B] text-[12px] font-normal leading-none">
      Reloj de operación
    </span>
    <span className="text-[#0F172A] font-mono text-[20px] font-semibold tracking-tight leading-none">
      {relojSimulado}
    </span>
    <div className="flex items-center gap-2.5 mt-0.5">
      <div className="px-2 py-1 bg-[#DBEAFE] rounded-[4px] flex items-center">
        <span className="text-[#1E40AF] font-mono font-medium text-[11px] leading-none">
          Turno 07:00–15:00
        </span>
      </div>
      <div className="px-2.5 py-1 bg-[#DBEAFE] rounded-[4px] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-[#1E40AF] rounded-full animate-pulse"></span>
        <span className="text-[#1E40AF] font-sans font-semibold text-[11px] tracking-[0.5px] leading-none">
          EN VIVO
        </span>
      </div>
    </div>
  </div>
);
