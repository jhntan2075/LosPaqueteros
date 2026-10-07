import React from 'react';
import { useConexionStomp } from '../../hooks/useConexionStomp';
import { useDatosOperacion } from '../../hooks/useDatosOperacion';
import { formatearFechaNumerica } from '../../lib/formato';
import { turnoVigente } from '../../lib/turnos';

/** Reloj de la operación día a día, con su turno vigente y el estado de la conexión en vivo. */
export const RelojOperacion: React.FC = () => {
  const { reloj } = useDatosOperacion();
  const conectado = useConexionStomp();
  return (
    <div className="h-[78px] flex flex-col justify-center gap-1.5 flex-shrink-0 pr-3">
      <span className="text-[#64748B] text-[12px] font-normal leading-none">
        Reloj de operación
      </span>
      <span className="text-[#0F172A] font-mono text-[20px] font-semibold tracking-tight leading-none">
        {formatearFechaNumerica(reloj, true)}
      </span>
      <div className="flex items-center gap-2.5 mt-0.5">
        <div className="px-2 py-1 bg-[#DBEAFE] rounded-[4px] flex items-center">
          <span className="text-[#1E40AF] font-mono font-medium text-[11px] leading-none">
            Turno {turnoVigente(reloj).actual}
          </span>
        </div>
        <div className={`px-2.5 py-1 rounded-[4px] flex items-center gap-1.5 ${conectado ? 'bg-[#DBEAFE]' : 'bg-[#F1F5F9]'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${conectado ? 'bg-[#1E40AF] animate-pulse' : 'bg-[#94A3B8]'}`}></span>
          <span className={`font-sans font-semibold text-[11px] tracking-[0.5px] leading-none ${conectado ? 'text-[#1E40AF]' : 'text-[#64748B]'}`}>
            {conectado ? 'EN VIVO' : 'SIN CONEXIÓN'}
          </span>
        </div>
      </div>
    </div>
  );
};
