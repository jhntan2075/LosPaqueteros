import React from 'react';

// Pantalla de espera mientras llega la primera instantánea de una ejecución, o su error.

interface EstadoConexionProps {
  titulo: string;
  error: string | null;
}

export const EstadoConexion: React.FC<EstadoConexionProps> = ({ titulo, error }) => (
  <div className="flex-1 flex items-center justify-center bg-neutral-50">
    <div className="bg-white border border-neutral-200 rounded-[10px] px-[28px] py-[22px] flex flex-col gap-[8px] max-w-[440px] text-center">
      <p className="font-sans font-semibold text-body-lg text-neutral-900">{titulo}</p>
      {error ? (
        <p className="font-sans text-body text-critical-600">{error}. Se reintentará al reconectar.</p>
      ) : (
        <p className="font-sans text-body text-neutral-500 flex items-center justify-center gap-[8px]">
          <span className="size-[6px] rounded-full bg-primary-600 animate-pulse" /> Conectando con el servidor…
        </p>
      )}
    </div>
  </div>
);
