// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefiereMenosMovimiento } from './movimiento';

afterEach(() => vi.unstubAllGlobals());

describe('prefiereMenosMovimiento', () => {
  it('es verdadero cuando el sistema pide menos movimiento', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal('matchMedia', matchMedia);
    expect(prefiereMenosMovimiento()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('es falso cuando no lo pide', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefiereMenosMovimiento()).toBe(false);
  });

  it('es falso si el entorno no tiene matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefiereMenosMovimiento()).toBe(false);
  });
});
