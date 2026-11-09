import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { ContextoAvisos, type Aviso } from '../../hooks/useAvisos';

// Aviso no bloqueante (snackbar) para confirmar una acción que tuvo efecto: aparece abajo al centro,
// se anuncia a los lectores de pantalla y se cierra solo. Uno a la vez: el nuevo reemplaza al anterior.

const DURACION_MS = 7000;

export const ProveedorAvisos: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aviso, setAviso] = useState<(Aviso & { id: number }) | null>(null);
  const siguienteId = useRef(0);
  const mostrar = useCallback((nuevo: Aviso) => setAviso({ ...nuevo, id: ++siguienteId.current }), []);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(null), DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  return (
    <ContextoAvisos.Provider value={mostrar}>
      {children}
      <div role="status" aria-live="polite" className="fixed left-1/2 -translate-x-1/2 bottom-11 z-50 pointer-events-none">
        {aviso && (
          <div
            key={aviso.id}
            className="pointer-events-auto flex items-center gap-3 bg-neutral-900 text-white rounded-control pl-3 pr-1.5 py-2 shadow-overlay text-body max-w-[calc(100vw-32px)]"
          >
            {aviso.tipo === 'error' ? (
              <AlertTriangle className="size-4 text-critical-600 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-4 text-ok-600 shrink-0" aria-hidden="true" />
            )}
            <span>{aviso.texto}</span>
            {aviso.accion && (
              <button
                type="button"
                onClick={() => {
                  aviso.accion?.alHacer();
                  setAviso(null);
                }}
                className="font-semibold text-primary-100 hover:text-white whitespace-nowrap"
              >
                {aviso.accion.etiqueta}
              </button>
            )}
            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Cerrar aviso"
              className="size-6 flex items-center justify-center rounded-control text-neutral-300 hover:text-white hover:bg-white/10"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </ContextoAvisos.Provider>
  );
};
