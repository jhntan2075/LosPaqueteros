import React, { useEffect, useRef } from 'react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';

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

/** Se monta solo mientras está abierto, para tomar el foco al abrir y devolverlo al cerrar. */
export const DialogoConfirmacion: React.FC<DialogoConfirmacionProps> = ({ abierto, ...props }) =>
  abierto ? <ContenidoConfirmacion {...props} /> : null;

const ContenidoConfirmacion: React.FC<Omit<DialogoConfirmacionProps, 'abierto'>> = ({
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
  const dialogo = useRef<HTMLDivElement>(null);
  useCerrarConEscape(!enCurso, onCancelar);
  useFocoAtrapado(dialogo);
  useEffect(() => {
    cancelarRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 leading-[normal]">
      <div
        ref={dialogo}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-confirmacion-titulo"
        aria-describedby="dialogo-confirmacion-descripcion"
        className="bg-white rounded-[10px] shadow-2xl border border-neutral-200 w-full max-w-[420px] p-[20px] flex flex-col gap-[12px]"
      >
        <h2 id="dialogo-confirmacion-titulo" className="font-sans font-semibold text-[16px] text-neutral-900">
          {titulo}
        </h2>
        <div id="dialogo-confirmacion-descripcion" className="font-sans text-[13px] text-neutral-700 flex flex-col gap-[6px]">
          {descripcion}
        </div>
        {error && <p className="border-l-[3px] border-critical-600 pl-[9px] font-sans text-[12px] text-critical-600">{error}</p>}
        <div className="mt-[4px] flex justify-end gap-[8px]">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancelar}
            disabled={enCurso}
            className="h-[34px] px-[14px] rounded-[6px] border border-neutral-300 font-sans font-medium text-[13px] text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={enCurso}
            className="h-[34px] px-[14px] rounded-[6px] bg-critical-600 hover:bg-critical-600/90 font-sans font-semibold text-[13px] text-white disabled:opacity-60"
          >
            {enCurso && textoEnCurso ? textoEnCurso : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
