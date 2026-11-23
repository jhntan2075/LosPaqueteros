import React from 'react';
import { SIM_ESCENARIO, SIM_FLOTA, SIM_INICIO, SIM_RITMO, SIMULACION, simFlota } from '../../config/glosario';
import { decimalesDe, formatearFechaLarga, formatearNumero } from '../../lib/formato';
import type { ConfiguracionCorrida } from '../../types/simulacion';
import { FilaDato } from '../ui';
import { TituloSeccion } from '../operacion/comunes';

/** Con qué configuración corre una simulación: escenario, inicio, flota y ritmo. En el día a día no hay bloque. */
export const BloqueSimulacion: React.FC<{ simulacion: ConfiguracionCorrida; className?: string }> = ({ simulacion, className }) => (
  <section aria-label={SIMULACION} className={`flex flex-col gap-1 ${className ?? ''}`}>
    <TituloSeccion>{SIMULACION}</TituloSeccion>
    <FilaDato etiqueta={SIM_ESCENARIO} valor={simulacion.escenario} texto />
    <FilaDato etiqueta={SIM_INICIO} valor={formatearFechaLarga(simulacion.inicio, false)} />
    <FilaDato etiqueta={SIM_FLOTA} valor={simFlota(simulacion.flota.autos, simulacion.flota.motos, simulacion.flota.bicicletas)} />
    <FilaDato etiqueta={SIM_RITMO} valor={`×${formatearNumero(simulacion.factorAceleracion, decimalesDe(simulacion.factorAceleracion))}`} />
  </section>
);
