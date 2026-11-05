// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useParametroUrl, useParametroUrlCerrado } from './useParametroUrl';

// Se restaura la URL entre pruebas: history.pushState/replaceState persiste en jsdom entre `it`.
afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useParametroUrl', () => {
  it('lee el valor inicial de la URL', () => {
    window.history.replaceState(null, '', '/?tab=pedidos');
    const { result } = renderHook(() => useParametroUrl('tab'));
    expect(result.current[0]).toBe('pedidos');
  });

  it('sin el parámetro en la URL, empieza en null', () => {
    const { result } = renderHook(() => useParametroUrl('tab'));
    expect(result.current[0]).toBeNull();
  });

  it('fijar un valor lo escribe en la URL y actualiza el estado', () => {
    const { result } = renderHook(() => useParametroUrl('tab'));
    act(() => result.current[1]('simulacion'));
    expect(result.current[0]).toBe('simulacion');
    expect(window.location.search).toBe('?tab=simulacion');
  });

  it('fijar null quita el parámetro de la URL', () => {
    window.history.replaceState(null, '', '/?tab=pedidos');
    const { result } = renderHook(() => useParametroUrl('tab'));
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('sin "empujar", reemplaza la entrada del historial en vez de crear una nueva', () => {
    const largoInicial = window.history.length;
    const { result } = renderHook(() => useParametroUrl('tab'));
    act(() => result.current[1]('pedidos'));
    expect(window.history.length).toBe(largoInicial);
  });

  it('con "empujar: true", crea una entrada nueva en el historial', () => {
    const largoInicial = window.history.length;
    const { result } = renderHook(() => useParametroUrl('tab'));
    act(() => result.current[1]('pedidos', { empujar: true }));
    expect(window.history.length).toBe(largoInicial + 1);
  });

  it('un evento popstate (atrás o adelante del navegador) actualiza el valor', () => {
    const { result } = renderHook(() => useParametroUrl('tab'));
    act(() => result.current[1]('simulacion', { empujar: true }));
    expect(result.current[0]).toBe('simulacion');
    // Lo que el navegador hace al ir atrás: la URL cambia sola y dispara popstate.
    act(() => {
      window.history.replaceState(null, '', '/?tab=pedidos');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toBe('pedidos');
  });
});

describe('useParametroUrlCerrado', () => {
  const VALIDOS = ['vivo', 'incidencias', 'flota'] as const;

  it('con la URL vacía, usa el valor por defecto', () => {
    const { result } = renderHook(() => useParametroUrlCerrado('panel', VALIDOS, 'vivo'));
    expect(result.current[0]).toBe('vivo');
  });

  it('un valor fuera del conjunto cae al valor por defecto, sin romper', () => {
    window.history.replaceState(null, '', '/?panel=algo-viejo-que-ya-no-existe');
    const { result } = renderHook(() => useParametroUrlCerrado('panel', VALIDOS, 'vivo'));
    expect(result.current[0]).toBe('vivo');
  });

  it('fijar el valor por defecto quita el parámetro de la URL', () => {
    window.history.replaceState(null, '', '/?panel=flota');
    const { result } = renderHook(() => useParametroUrlCerrado('panel', VALIDOS, 'vivo'));
    act(() => result.current[1]('vivo'));
    expect(window.location.search).toBe('');
  });

  it('fijar un valor distinto del por defecto lo escribe en la URL', () => {
    const { result } = renderHook(() => useParametroUrlCerrado('panel', VALIDOS, 'vivo'));
    act(() => result.current[1]('flota'));
    expect(window.location.search).toBe('?panel=flota');
  });
});
