import { paleta } from '../../tailwind.config.js';
import type { NivelHolgura } from '../types/pedidos';

// Colores para lo que no admite clases de Tailwind: trazos y rellenos de SVG, estilos en línea y los
// íconos que se recolorean. Salen de la misma paleta que las clases (tailwind.config.js), así el mapa y
// la interfaz no se desalinean. Reglas de uso en docs/design-system.md.

export const NEUTRO = paleta.neutral;
export const PRIMARIO = paleta.primary[600];
export const CRITICO = paleta.critical[600];
export const CRITICO_SUAVE = paleta.critical[50];
/** Naranja de atención: solo relleno, borde o ícono, nunca texto sobre blanco (contraste 2.5). */
export const ATENCION = paleta.warn[500];
export const OK = paleta.ok[600];
export const BLANCO = '#FFFFFF';

/** Semáforo como relleno (pines, íconos, barras): crítico, atención, ok o neutro si está cerrado. */
export const COLOR_NIVEL: Record<NivelHolgura, string> = {
  ROJO: CRITICO,
  AMBAR: ATENCION,
  VERDE: OK,
  CERRADO: NEUTRO[400],
};
