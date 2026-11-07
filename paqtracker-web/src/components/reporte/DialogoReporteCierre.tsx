import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { formatearFechaLarga } from '../../lib/formato';
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
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 flex items-stretch justify-center p-[24px]" data-sin-zoom>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-reporte-cierre"
        className="w-full max-w-[1100px] bg-[#F8FAFC] rounded-[10px] shadow-[0px_8px_32px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
      >
        <header className="h-[64px] bg-white border-b border-[#E2E8F0] px-[24px] flex items-center gap-[12px] shrink-0" data-no-imprimir>
          <div className="flex flex-col">
            <h1 id="titulo-reporte-cierre" className="font-semibold text-[16px] text-[#0F172A]">
              {diaADia ? 'Reporte de cierre · operación día a día' : 'Última planificación estable'}
            </h1>
            <p className="text-[12px] text-[#64748B]">
              Generado {formatearFechaLarga(reloj, false)}. {diaADia ? 'No detiene la operación.' : 'No detiene la simulación.'}
            </p>
          </div>
          <button type="button" onClick={onCerrar} autoFocus className="ml-auto h-[32px] px-[14px] rounded-[6px] bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-[12px] font-semibold">
            Cerrar
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ReportePlanificacion ejecucionId={ejecucionId} actualizable />
        </div>
      </div>
    </div>,
    document.body,
  );
};
