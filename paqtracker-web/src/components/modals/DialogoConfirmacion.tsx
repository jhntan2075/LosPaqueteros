import React, { useEffect, useRef } from 'react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';

// Confirmación de acciones que no se pueden deshacer. El foco arranca en "Cancelar": un Enter
// apresurado no ejecuta la acción.

interface DialogoConfirmacionProps {
  abierto: boolean;
  titulo: string;
  descripcion: React.ReactNode;
  textoConfirmar: string;
  /** Texto del botón mientras la acción está en curso. */
  textoEnCurso?: string;
  enCurso?: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export const DialogoConfirmacion: React.FC<DialogoConfirmacionProps> = ({
  abierto,
  titulo,
  descripcion,
  textoConfirmar,
  textoEnCurso,
  enCurso = false,
  error,
  onConfirmar,
  onCancelar,
}) => {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  useCerrarConEscape(abierto && !enCurso, onCancelar);
  useEffect(() => {
    if (abierto) cancelarRef.current?.focus();
  }, [abierto]);
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 leading-[normal]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-confirmacion-titulo"
        aria-describedby="dialogo-confirmacion-descripcion"
        className="bg-white rounded-[10px] shadow-2xl border border-[#E2E8F0] w-full max-w-[420px] p-[20px] flex flex-col gap-[12px]"
      >
        <h2 id="dialogo-confirmacion-titulo" className="font-sans font-semibold text-[16px] text-[#0F172A]">
          {titulo}
        </h2>
        <div id="dialogo-confirmacion-descripcion" className="font-sans text-[13px] text-[#334155] flex flex-col gap-[6px]">
          {descripcion}
        </div>
        {error && <p className="border-l-[3px] border-[#B91C1C] pl-[9px] font-sans text-[12px] text-[#B91C1C]">{error}</p>}
        <div className="mt-[4px] flex justify-end gap-[8px]">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancelar}
            disabled={enCurso}
            className="h-[34px] px-[14px] rounded-[4px] border border-[#CBD5E1] font-sans font-medium text-[13px] text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={enCurso}
            className="h-[34px] px-[14px] rounded-[4px] bg-[#B91C1C] hover:bg-[#991B1B] font-sans font-semibold text-[13px] text-white disabled:opacity-60"
          >
            {enCurso && textoEnCurso ? textoEnCurso : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
