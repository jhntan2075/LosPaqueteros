import React from 'react';

// Encabezado de operación de 56 px (Figma 1:1201). El reloj no cabe en la barra lateral, por eso
// sobrevive esta franja contextual. El día a día corre en tiempo real: no hay controles de velocidad.

interface EncabezadoOperacionProps {
  relojSimulado: string;
  turno: string;
  conectado: boolean;
}

export const EncabezadoOperacion: React.FC<EncabezadoOperacionProps> = ({ relojSimulado, turno, conectado }) => (
  <header className="h-[56px] bg-white border-b border-[#E2E8F0] px-[16px] flex items-center gap-[20px] shrink-0 leading-[normal]">
    <div className="flex flex-col gap-[2px] whitespace-nowrap">
      <span className="font-sans text-[12px] text-[#64748B]">Reloj de operación</span>
      <span className="font-mono font-semibold text-[20px] text-[#0F172A]">{relojSimulado}</span>
    </div>
    <span className="bg-[#DBEAFE] rounded-[4px] px-[8px] py-[4px] font-mono font-medium text-[12px] text-[#1E40AF] whitespace-nowrap">
      Turno {turno}
    </span>
    <div className="flex-1" />
    <span
      title={conectado ? 'Recibiendo el estado en vivo del planificador' : 'Sin conexión con el servidor: reintentando'}
      className={`rounded-[4px] px-[10px] py-[5px] flex items-center gap-[6px] font-sans font-semibold text-[12px] tracking-[0.5px] whitespace-nowrap ${
        conectado ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#F1F5F9] text-[#64748B]'
      }`}
    >
      <span className={`size-[6px] rounded-full ${conectado ? 'bg-[#1E40AF] animate-pulse' : 'bg-[#94A3B8]'}`} />
      {conectado ? 'EN VIVO' : 'SIN CONEXIÓN'}
    </span>
  </header>
);
