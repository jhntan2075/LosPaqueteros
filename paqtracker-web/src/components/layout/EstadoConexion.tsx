import React from 'react';

// Pantalla de espera mientras llega la primera instantánea de una ejecución, o su error.

interface EstadoConexionProps {
  titulo: string;
  error: string | null;
}

export const EstadoConexion: React.FC<EstadoConexionProps> = ({ titulo, error }) => (
  <div className="flex-1 flex items-center justify-center bg-[#F8FAFC]">
    <div className="bg-white border border-[#E2E8F0] rounded-[10px] px-[28px] py-[22px] flex flex-col gap-[8px] max-w-[440px] text-center">
      <p className="font-sans font-semibold text-[14px] text-[#0F172A]">{titulo}</p>
      {error ? (
        <p className="font-sans text-[12px] text-[#B91C1C]">{error}. Se reintentará al reconectar.</p>
      ) : (
        <p className="font-sans text-[12px] text-[#64748B] flex items-center justify-center gap-[8px]">
          <span className="size-[6px] rounded-full bg-[#1E40AF] animate-pulse" /> Conectando con el servidor…
        </p>
      )}
    </div>
  </div>
);
