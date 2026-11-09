import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { formatearFechaLarga } from '../../lib/formato';
import { Boton } from '../ui';
import { ReportePlanificacion } from './ReportePlanificacion';

// Reporte de cierre de la operación día a día (rúbrica 91.EvaSw G09): la última planificación estable en un
// diálogo de pantalla completa. Generarlo no detiene la operación; se puede actualizar, exportar e imprimir.

interface DialogoReporteCierreProps {
  ejecucionId: string;
  /** Día a día: reporte de cierre (G09). En una simulación en curso: la última planificación estable. */
  diaADia: boolean;
  /** Reloj de la operación al generar el reporte. */
  reloj: Date;
  onCerrar: () => void;
}

export const DialogoReporteCierre: React.FC<DialogoReporteCierreProps> = ({ ejecucionId, diaADia, reloj, onCerrar }) => {
  const dialogo = useRef<HTMLDivElement>(null);
  useFocoAtrapado(dialogo);
  useCerrarConEscape(true, onCerrar);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-velo/40 p-6" data-sin-zoom>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-reporte-cierre"
        className="flex w-full max-w-6xl flex-col overflow-hidden rounded-card bg-superficie shadow-overlay"
      >
        <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-neutral-200 bg-superficie px-6 py-3" data-no-imprimir>
          <div className="flex flex-col gap-0.5">
            <h1 id="titulo-reporte-cierre" className="text-title text-neutral-900">
              {diaADia ? 'Reporte de cierre · operación día a día' : 'Última planificación estable'}
            </h1>
            <p className="text-body-sm text-neutral-600">
              Generado {formatearFechaLarga(reloj, false)}. {diaADia ? 'No detiene la operación.' : 'No detiene la simulación.'}
            </p>
          </div>
          <Boton variante="primario" onClick={onCerrar} autoFocus className="ml-auto">
            Cerrar
          </Boton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ReportePlanificacion ejecucionId={ejecucionId} actualizable />
        </div>
      </div>
    </div>,
    document.body,
  );
};
