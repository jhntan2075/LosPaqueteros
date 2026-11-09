import React from 'react';
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/clases';

// Mensaje en línea con ícono (los mismos de layout/Avisos.tsx: AlertTriangle y CheckCircle2). Reemplaza
// los bordes izquierdos de 3 px, las cajas de color sueltas y los errores en rojo sin ícono.

export type TonoAviso = 'info' | 'ok' | 'warn' | 'critical' | 'neutral';

const CAJA: Record<TonoAviso, string> = {
  info: 'bg-info-50 border-info-600/25 text-info-700',
  ok: 'bg-ok-50 border-ok-600/25 text-ok-700',
  warn: 'bg-warn-50 border-warn-500/40 text-warn-700',
  critical: 'bg-critical-50 border-critical-600/25 text-critical-600',
  neutral: 'bg-neutral-50 border-neutral-200 text-neutral-700',
};

const TEXTO: Record<TonoAviso, string> = {
  info: 'text-info-700',
  ok: 'text-ok-700',
  warn: 'text-warn-700',
  critical: 'text-critical-600',
  neutral: 'text-neutral-600',
};

const ICONO: Record<TonoAviso, LucideIcon> = {
  info: Info,
  ok: CheckCircle2,
  warn: AlertTriangle,
  critical: AlertTriangle,
  neutral: Info,
};

interface AvisoProps {
  tono?: TonoAviso;
  titulo?: React.ReactNode;
  /** Botón de la acción siguiente, a la derecha. */
  accion?: React.ReactNode;
  /** Solo ícono y texto, sin caja: para mensajes bajo un formulario o un botón. */
  compacto?: boolean;
  /** `alert` para errores que aparecen tras una acción; `status` para avisos que cambian solos. */
  role?: 'alert' | 'status';
  icono?: LucideIcon | null;
  className?: string;
  children?: React.ReactNode;
}

export const Aviso: React.FC<AvisoProps> = ({ tono = 'info', titulo, accion, compacto = false, role, icono, className, children }) => {
  const Icono = icono === null ? null : (icono ?? ICONO[tono]);
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2 text-body-sm',
        compacto ? TEXTO[tono] : cn('rounded-card border px-3 py-2.5', CAJA[tono]),
        className,
      )}
    >
      {Icono && <Icono className="mt-px size-4 shrink-0" aria-hidden="true" />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={cn(!compacto && titulo ? 'text-neutral-700' : undefined)}>{children}</div>}
      </div>
      {accion && <div className="shrink-0 self-center">{accion}</div>}
    </div>
  );
};
