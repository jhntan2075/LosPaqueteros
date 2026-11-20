// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnchoAngosto } from './useAnchoAngosto';

function simularMatchMedia(coincide: boolean) {
  const oyentes = new Set<() => void>();
  const consulta = {
    matches: coincide,
    addEventListener: vi.fn((_: string, oyente: () => void) => oyentes.add(oyente)),
    removeEventListener: vi.fn((_: string, oyente: () => void) => oyentes.delete(oyente)),
  };
  const matchMedia = vi.fn(() => consulta);
  vi.stubGlobal('matchMedia', matchMedia);
  return { consulta, matchMedia, emitir: () => oyentes.forEach((o) => o()) };
}

afterEach(() => vi.unstubAllGlobals());

describe('useAnchoAngosto', () => {
  it('es true con pantalla angosta y consulta (max-width: 767px)', () => {
    const { matchMedia } = simularMatchMedia(true);
    const { result } = renderHook(() => useAnchoAngosto());
    expect(result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('es false con pantalla ancha', () => {
    simularMatchMedia(false);
    const { result } = renderHook(() => useAnchoAngosto());
    expect(result.current).toBe(false);
  });

  it('es false si matchMedia no existe', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useAnchoAngosto());
    expect(result.current).toBe(false);
  });

  it('se actualiza con el evento change y se desuscribe al desmontar', () => {
    const { consulta, emitir } = simularMatchMedia(false);
    const { result, unmount } = renderHook(() => useAnchoAngosto());
    expect(result.current).toBe(false);
    consulta.matches = true;
    act(() => emitir());
    expect(result.current).toBe(true);
    unmount();
    expect(consulta.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
