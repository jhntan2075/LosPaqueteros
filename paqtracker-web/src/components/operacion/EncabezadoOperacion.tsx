import React from 'react';
import { VELOCIDADES_REPRODUCCION, type VelocidadReproduccion } from '../../hooks/useRelojEnVivo';

// Encabezado de operación de 56 px (Figma 1:1201). El reloj no cabe en la barra lateral, por eso
// sobrevive esta franja contextual.

interface EncabezadoOperacionProps {
  relojSimulado: string;
  conectado: boolean;
  /** Velocidad de reproducción local; se omite cuando el reloj lo publica paqtracker-api. */
  velocidad?: VelocidadReproduccion;
  onCambiarVelocidad?: (velocidad: VelocidadReproduccion) => void;
}

export const EncabezadoOperacion: React.FC<EncabezadoOperacionProps> = ({ relojSimulado, conectado, velocidad, onCambiarVelocidad }) => (
  <header className="h-[56px] bg-white border-b border-[#E2E8F0] px-[16px] flex items-center gap-[20px] shrink-0 leading-[normal]">
    <div className="flex flex-col gap-[2px] whitespace-nowrap">
      <span className="font-sans text-[12px] text-[#64748B]">Reloj de operación</span>
      <span className="font-mono font-semibold text-[20px] text-[#0F172A]">{relojSimulado}</span>
    </div>
    <span className="bg-[#DBEAFE] rounded-[4px] px-[8px] py-[4px] font-mono font-medium text-[12px] text-[#1E40AF] whitespace-nowrap">
      Turno 07:00–15:00
    </span>
    <div className="bg-[#E2E8F0] h-[36px] w-px shrink-0" />
    {velocidad !== undefined && onCambiarVelocidad && (
      <div className="flex items-center gap-[8px]" title="Velocidad de reproducción del reloj sin conexión. ×1 es tiempo real.">
        <span className="font-sans text-[12px] text-[#64748B]">Velocidad</span>
        <div className="flex border border-[#E2E8F0] rounded-[4px] overflow-hidden" role="radiogroup" aria-label="Velocidad de reproducción">
          {VELOCIDADES_REPRODUCCION.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={velocidad === v}
              onClick={() => onCambiarVelocidad(v)}
              className={`px-[8px] py-[3px] font-mono text-[12px] border-l border-[#E2E8F0] first:border-l-0 ${
                velocidad === v ? 'bg-[#DBEAFE] text-[#1E40AF] font-medium' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              ×{v}
            </button>
          ))}
        </div>
      </div>
    )}
    <div className="flex-1" />
    <span
      title={conectado ? 'Recibiendo el estado en vivo del planificador' : 'Sin conexión con paqtracker-api: se muestran datos de ejemplo'}
      className={`rounded-[4px] px-[10px] py-[5px] flex items-center gap-[6px] font-sans font-semibold text-[12px] tracking-[0.5px] whitespace-nowrap ${
        conectado ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#F1F5F9] text-[#64748B]'
      }`}
    >
      <span className={`size-[6px] rounded-full ${conectado ? 'bg-[#1E40AF]' : 'bg-[#94A3B8]'}`} />
      {conectado ? 'EN VIVO' : 'SIN CONEXIÓN'}
    </span>
  </header>
);
