import React, { useState } from 'react';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { ConfiguracionEscenario } from './ConfiguracionEscenario';
import { CorridaSimulacion, type ResultadoCorrida } from './CorridaSimulacion';
import { InformeCorrida } from './InformeCorrida';

// Flujo de Simulación: configuración de escenario → corrida → informe.

interface ModuloSimulacionProps {
  onVerBitacoraCompleta: () => void;
  onAbrirLeyenda: () => void;
}

export const ModuloSimulacion: React.FC<ModuloSimulacionProps> = ({ onVerBitacoraCompleta, onAbrirLeyenda }) => {
  const [configuracion, setConfiguracion] = useState<ConfiguracionCorrida | null>(null);
  const [resultado, setResultado] = useState<ResultadoCorrida | null>(null);
  // Cada ejecución monta una corrida nueva (su reloj arranca al montarse).
  const [idCorrida, setIdCorrida] = useState(0);
  const [verInforme, setVerInforme] = useState(false);

  if (!configuracion) {
    return (
      <ConfiguracionEscenario
        onEjecutar={(nueva) => {
          setConfiguracion(nueva);
          setResultado(null);
          setVerInforme(false);
          setIdCorrida((id) => id + 1);
        }}
      />
    );
  }

  // La corrida sigue montada (oculta) mientras se ve el informe, para no reiniciar su reloj.
  return (
    <>
      <div className={verInforme && resultado ? 'hidden' : 'flex-1 flex flex-col min-h-0'}>
        <CorridaSimulacion
          key={idCorrida}
          configuracion={configuracion}
          onDetener={() => setConfiguracion(null)}
          onVerInforme={(r) => {
            setResultado(r);
            setVerInforme(true);
          }}
          onVerBitacoraCompleta={onVerBitacoraCompleta}
          onAbrirLeyenda={onAbrirLeyenda}
        />
      </div>
      {verInforme && resultado && (
        <InformeCorrida
          configuracion={configuracion}
          resultado={resultado}
          onVolverACorrida={() => setVerInforme(false)}
          onNuevaCorrida={() => setConfiguracion(null)}
        />
      )}
    </>
  );
};
