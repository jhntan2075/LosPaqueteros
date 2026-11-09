import React from 'react';
import { Clock } from 'lucide-react';
import { useAhora } from '../../hooks/useAhora';
import { formatearFechaLarga } from '../../lib/formato';

// Relojes de la barra superior: el de la operación día a día y el real del equipo, en una sola pieza.
// Misma lectura que el encabezado de la corrida en Simulación (etiqueta arriba, valor abajo): la hora
// destaca y la fecha la acompaña en la línea de la etiqueta. El reloj de la operación manda; el real es
// referencia y se oculta en pantallas angostas.

/** Etiqueta + fecha arriba, hora abajo. El " · " oculto deja la lectura "28 oct 2026 · 15:04:05". */
const Reloj: React.FC<{ etiqueta: string; fecha: string; hora: string; principal?: boolean }> = ({ etiqueta, fecha, hora, principal = false }) => (
  <span className="flex flex-col justify-center">
    <span className="whitespace-nowrap text-caption text-neutral-500">
      <span className="font-semibold uppercase tracking-wide text-neutral-600">{etiqueta}</span> {fecha}
      <span className="sr-only"> · </span>
    </span>
    <span
      className={
        principal
          ? 'text-title-sm leading-4 tabular-nums text-neutral-900'
          : 'text-body-sm font-medium leading-4 tabular-nums text-neutral-700'
      }
    >
      {hora}
    </span>
  </span>
);

interface RelojesBarraProps {
  /** Reloj de la operación día a día, en el mismo formato que el real: "8 nov 2026 · 22:38:12". */
  operacion: string;
}

export const RelojesBarra: React.FC<RelojesBarraProps> = ({ operacion }) => {
  const ahora = useAhora();
  const [fechaOperacion, horaOperacion = ''] = operacion.split(' · ');
  const [fechaReal, horaReal] = formatearFechaLarga(ahora).split(' · ');
  return (
    <div className="flex h-10 shrink-0 items-stretch rounded-control border border-neutral-200 bg-superficie shadow-xs">
      <div role="group" aria-label="Reloj de la operación día a día" title="Reloj de la operación día a día" className="flex items-center gap-2 pl-2.5 pr-3">
        <Clock className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
        <Reloj etiqueta="Operación" fecha={fechaOperacion} hora={horaOperacion} principal />
      </div>
      <span className="my-2 hidden w-px bg-neutral-200 md:block" aria-hidden="true" />
      <div role="group" aria-label="Fecha y hora real" title="Fecha y hora real del equipo" className="hidden items-center px-3 md:flex">
        <Reloj etiqueta="Real" fecha={fechaReal} hora={horaReal} />
      </div>
    </div>
  );
};
