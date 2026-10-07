import React, { useState } from 'react';
import type { EjecucionApi } from '../../types/api';
import { ConfiguracionEscenario } from './ConfiguracionEscenario';
import { CorridaSimulacion } from './CorridaSimulacion';

// Flujo de Simulación: configuración de escenario (o elegir una existente) → corrida → informe.

interface ModuloSimulacionProps {
  onVerBitacoraCompleta: () => void;
  onAbrirLeyenda: () => void;
}

export const ModuloSimulacion: React.FC<ModuloSimulacionProps> = ({ onVerBitacoraCompleta, onAbrirLeyenda }) => {
  const [ejecucion, setEjecucion] = useState<EjecucionApi | null>(null);

  if (!ejecucion) {
    return <ConfiguracionEscenario onAbrir={setEjecucion} />;
  }
  return (
    <CorridaSimulacion
      key={ejecucion.id}
      ejecucion={ejecucion}
      onSalir={() => setEjecucion(null)}
      onVerBitacoraCompleta={onVerBitacoraCompleta}
      onAbrirLeyenda={onAbrirLeyenda}
    />
  );
};
