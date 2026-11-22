// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../services/clienteApi';
import type { MensajeEventoApi } from '../types/api';
import { useEstadoEjecucion } from './useEstadoEjecucion';

const stomp = vi.hoisted(() => ({
  oyentes: new Map<string, (cuerpo: unknown) => void>(),
  conexion: null as null | ((conectado: boolean) => void),
}));

vi.mock('../services/clienteStomp', () => ({
  suscribir: (destino: string, oyente: (cuerpo: unknown) => void) => {
    stomp.oyentes.set(destino, oyente);
    return () => stomp.oyentes.delete(destino);
  },
  alCambiarConexion: (oyente: (conectado: boolean) => void) => {
    stomp.conexion = oyente;
    return () => {
      stomp.conexion = null;
    };
  },
}));

const evento = (id: string, ts: number, tipo: MensajeEventoApi['tipo'] = 'NUEVO_PEDIDO'): MensajeEventoApi => ({
  id,
  ejecucionId: 'e1',
  tipo,
  mensaje: id,
  timestampSimuladoMs: ts,
  detalle: {},
});

beforeEach(() => {
  stomp.oyentes.clear();
  stomp.conexion = null;
  vi.spyOn(clienteApi, 'estado').mockReturnValue(new Promise(() => {}));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useEstadoEjecucion · historial de eventos', () => {
  it('carga el historial al abrir la ejecución', async () => {
    const pedir = vi.spyOn(clienteApi, 'eventos').mockResolvedValue([evento('b', 20), evento('a', 10)]);
    const { result } = renderHook(() => useEstadoEjecucion('e1'));
    await waitFor(() => expect(result.current.eventos.map((e) => e.id)).toEqual(['b', 'a']));
    expect(pedir).toHaveBeenCalledWith('e1');
  });

  it('una respuesta tardía no descarta los eventos que llegaron en vivo', async () => {
    let responder!: (e: MensajeEventoApi[]) => void;
    vi.spyOn(clienteApi, 'eventos').mockReturnValue(new Promise((r) => (responder = r)));
    const { result } = renderHook(() => useEstadoEjecucion('e1'));
    act(() => stomp.oyentes.get('/topic/ejecuciones/e1/eventos')!(evento('vivo', 300, 'UNIDAD_AVERIADA')));
    await act(async () => responder([evento('vivo', 300, 'UNIDAD_AVERIADA'), evento('h', 100)]));
    expect(result.current.eventos.map((e) => e.id)).toEqual(['vivo', 'h']);
  });

  it('vuelve a pedir el historial al reconectar el socket', async () => {
    const pedir = vi.spyOn(clienteApi, 'eventos').mockResolvedValue([]);
    renderHook(() => useEstadoEjecucion('e1'));
    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));
    act(() => stomp.conexion!(false));
    expect(pedir).toHaveBeenCalledTimes(1);
    act(() => stomp.conexion!(true));
    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));
  });

  it('vuelve a pedir el historial cuando la pestaña vuelve a ser visible', async () => {
    const pedir = vi.spyOn(clienteApi, 'eventos').mockResolvedValue([]);
    renderHook(() => useEstadoEjecucion('e1'));
    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));
  });

  it('si el historial falla, sigue mostrando los eventos en vivo', async () => {
    vi.spyOn(clienteApi, 'eventos').mockRejectedValue(new Error('caído'));
    const { result } = renderHook(() => useEstadoEjecucion('e1'));
    act(() => stomp.oyentes.get('/topic/ejecuciones/e1/eventos')!(evento('vivo', 5)));
    await waitFor(() => expect(result.current.eventos.map((e) => e.id)).toEqual(['vivo']));
  });
});
