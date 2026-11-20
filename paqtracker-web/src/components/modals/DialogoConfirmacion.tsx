import React, { useEffect, useRef } from 'react';
import { useCerrarConEscape } from '../../hooks/useCerrarConEscape';
import { useFocoAtrapado } from '../../hooks/useFocoAtrapado';
import { Aviso, Boton } from '../ui';

// Confirmación de acciones. Con tono 'peligro' (por defecto) es para acciones que no se pueden
// deshacer; con 'normal', para acciones que piden confirmar sin ser destructivas. El foco arranca
// en "Cancelar" con cualquier tono: un Enter apresurado no ejecuta la acción.

interface DialogoConfirmacionProps {
  abierto: boolean;
  titulo: string;
  descripcion: React.ReactNode;
  textoConfirmar: string;
  /** 'peligro' (por defecto): botón rojo y alertdialog. 'normal': botón primario y dialog. */
  tono?: 'peligro' | 'normal';
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
  tono = 'peligro',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-velo/40 p-4">
      <div
        ref={dialogo}
        role={tono === 'peligro' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="dialogo-confirmacion-titulo"
        aria-describedby="dialogo-confirmacion-descripcion"
        className="flex w-full max-w-md flex-col gap-3 rounded-card border border-neutral-200 bg-superficie p-5 shadow-overlay"
      >
        <h2 id="dialogo-confirmacion-titulo" className="text-title text-neutral-900">
          {titulo}
        </h2>
        <div id="dialogo-confirmacion-descripcion" className="flex flex-col gap-1.5 text-body text-neutral-700">
          {descripcion}
        </div>
        {error && (
          <Aviso tono="critical" role="alert">
            {error}
          </Aviso>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <Boton ref={cancelarRef} variante="secundario" onClick={onCancelar} disabled={enCurso}>
            Cancelar
          </Boton>
          <Boton variante={tono === 'peligro' ? 'peligro' : 'primario'} onClick={onConfirmar} disabled={enCurso}>
            {enCurso && textoEnCurso ? textoEnCurso : textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
};
