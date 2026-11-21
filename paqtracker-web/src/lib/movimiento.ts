/** El sistema pidió reducir el movimiento (animaciones y desplazamientos suaves). */
export const prefiereMenosMovimiento = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
