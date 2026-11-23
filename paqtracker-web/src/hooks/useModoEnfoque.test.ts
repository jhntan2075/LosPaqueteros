// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useModoEnfoque } from './useModoEnfoque';

describe('useModoEnfoque', () => {
  it('activarlo cierra el panel; apagarlo no lo vuelve a abrir', () => {
    const cerrarPanel = vi.fn();
    const { result } = renderHook(() => useModoEnfoque(false, cerrarPanel));
    expect(result.current.enfoque).toBe(false);
    act(() => result.current.cambiar(true));
    expect(result.current.enfoque).toBe(true);
    expect(cerrarPanel).toHaveBeenCalledTimes(1);
    act(() => result.current.cambiar(false));
    expect(result.current.enfoque).toBe(false);
    expect(cerrarPanel).toHaveBeenCalledTimes(1);
  });

  it('si se abre un panel mientras está activo, sale del modo y no vuelve al cerrar ese panel', () => {
    let panelAbierto = false;
    const { result, rerender } = renderHook(() => useModoEnfoque(panelAbierto, () => {}));
    act(() => result.current.cambiar(true));
    expect(result.current.enfoque).toBe(true);
    panelAbierto = true;
    rerender();
    expect(result.current.enfoque).toBe(false);
    panelAbierto = false;
    rerender();
    expect(result.current.enfoque).toBe(false);
  });
});
