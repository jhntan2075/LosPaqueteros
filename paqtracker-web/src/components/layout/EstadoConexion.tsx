import React from 'react';
import { EstadoCarga, EstadoError } from '../ui';

// Pantalla de espera mientras llega la primera instantánea de una ejecución, o su error.

interface EstadoConexionProps {
  titulo: string;
  error: string | null;
}

export const EstadoConexion: React.FC<EstadoConexionProps> = ({ titulo, error }) => (
  <div className="flex-1 flex items-center justify-center bg-neutral-50">
    <div className="bg-superficie border border-neutral-200 rounded-card px-7 py-6 flex flex-col gap-2 max-w-[440px] text-center">
      <p className="font-sans font-semibold text-title-sm text-neutral-900">{titulo}</p>
      {error ? (
        <EstadoError titulo={error} descripcion="Se reintentará al reconectar." />
      ) : (
        <EstadoCarga texto="Conectando con el servidor…" />
      )}
    </div>
  </div>
);
