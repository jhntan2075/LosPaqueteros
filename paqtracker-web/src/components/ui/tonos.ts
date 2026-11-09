// Colores por tono, compartidos por Insignia, FilaDato, Indicador y las pantallas.

export type Tono = 'neutral' | 'primary' | 'info' | 'ok' | 'warn' | 'critical';

export const FONDO_TONO: Record<Tono, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  primary: 'bg-primary-50 text-primary-700',
  info: 'bg-info-50 text-info-700',
  ok: 'bg-ok-50 text-ok-700',
  warn: 'bg-warn-50 text-warn-700',
  critical: 'bg-critical-50 text-critical-600',
};

export const PUNTO_TONO: Record<Tono, string> = {
  neutral: 'bg-neutral-500',
  primary: 'bg-primary-600',
  info: 'bg-info-600',
  ok: 'bg-ok-600',
  warn: 'bg-warn-500',
  critical: 'bg-critical-600',
};

/** Color de texto de cada tono sobre blanco (cumple AA). */
export const TEXTO_TONO: Record<Tono, string> = {
  neutral: 'text-neutral-900',
  primary: 'text-primary-700',
  info: 'text-info-700',
  ok: 'text-ok-700',
  warn: 'text-warn-700',
  critical: 'text-critical-600',
};
