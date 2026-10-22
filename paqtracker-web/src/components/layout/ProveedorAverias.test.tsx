// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAverias } from '../../hooks/useAverias';
import { ErrorDeApi, clienteApi } from '../../services/clienteApi';
import type { RespuestaRegistroAveriaApi } from '../../types/api';
import { ProveedorAverias } from './ProveedorAverias';

const respuesta: RespuestaRegistroAveriaApi = {
  id: 9,
  ejecucionId: 'ej-1',
  unidad: 'M-03',
  tipo: 2,
  estado: 'PROGRAMADA',
  instanteMs: 1000,
  reincorporacionMs: 2000,
  trasladoCentralMs: null,
};

const montar = () => renderHook(() => useAverias(), { wrapper: ({ children }) => <ProveedorAverias>{children}</ProveedorAverias> });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProveedorAverias', () => {
  it('registrar guarda la avería como pendiente de la unidad', async () => {
    const llamada = vi.spyOn(clienteApi, 'registrarAveria').mockResolvedValue(respuesta);
    const { result } = montar();
    expect(result.current.pendientes).toEqual({});

    await act(async () => {
      await expect(result.current.registrar('ej-1', 'M-03', 2)).resolves.toBe(respuesta);
    });

    expect(llamada).toHaveBeenCalledWith('ej-1', 'M-03', 2);
    expect(result.current.pendientes).toEqual({ 'ej-1:M-03': respuesta });
  });

  it.each([
    [new ErrorDeApi(0, 'x'), /Revisa la conexión/],
    [new ErrorDeApi(404, 'x'), /No se encontró la unidad M-03/],
    [new ErrorDeApi(409, 'La unidad M-03 está averiada'), /M-03 ya está averiada/],
    [new ErrorDeApi(409, 'Simulación hasta el colapso'), /^Esta simulación no admite averías\.$/],
    [new ErrorDeApi(409, 'Ejecución finalizada'), /^La ejecución terminó: no admite averías\.$/],
    [new ErrorDeApi(500, 'x'), /Inténtalo de nuevo/],
    [new Error('inesperado'), /Revisa la conexión/],
  ])('traduce el error de la API a un mensaje para el operador (%#)', async (error, esperado) => {
    vi.spyOn(clienteApi, 'registrarAveria').mockRejectedValue(error);
    const { result } = montar();

    let capturado: unknown;
    await act(async () => {
      capturado = await result.current.registrar('ej-1', 'M-03', 1).catch((e: unknown) => e);
    });

    expect(capturado).toBeInstanceOf(Error);
    expect((capturado as Error).message).toMatch(esperado);
    expect(result.current.pendientes).toEqual({});
  });

  describe('cancelar', () => {
    const registrarPendiente = async (result: ReturnType<typeof montar>['result']) => {
      vi.spyOn(clienteApi, 'registrarAveria').mockResolvedValue(respuesta);
      await act(async () => {
        await result.current.registrar('ej-1', 'M-03', 2);
      });
    };

    it('deshace la avería con su id y la quita de las pendientes', async () => {
      const llamada = vi.spyOn(clienteApi, 'cancelarAveria').mockResolvedValue();
      const { result } = montar();
      await registrarPendiente(result);

      await act(async () => {
        await result.current.cancelar('ej-1', 'M-03');
      });

      expect(llamada).toHaveBeenCalledWith('ej-1', 9);
      expect(result.current.pendientes).toEqual({});
    });

    it('si el motor ya la aplicó (409) avisa que no se puede deshacer y la deja pendiente', async () => {
      vi.spyOn(clienteApi, 'cancelarAveria').mockRejectedValue(new ErrorDeApi(409, 'ya se aplico'));
      const { result } = montar();
      await registrarPendiente(result);

      let capturado: unknown;
      await act(async () => {
        capturado = await result.current.cancelar('ej-1', 'M-03').catch((e: unknown) => e);
      });

      expect((capturado as Error).message).toBe('La avería de M-03 ya se aplicó: no se puede deshacer.');
      expect(result.current.pendientes).toEqual({ 'ej-1:M-03': respuesta });
    });

    it('sin conexión pide reintentar', async () => {
      vi.spyOn(clienteApi, 'cancelarAveria').mockRejectedValue(new ErrorDeApi(0, 'x'));
      const { result } = montar();
      await registrarPendiente(result);

      let capturado: unknown;
      await act(async () => {
        capturado = await result.current.cancelar('ej-1', 'M-03').catch((e: unknown) => e);
      });

      expect((capturado as Error).message).toMatch(/Revisa la conexión/);
    });

    it('sin una avería pendiente de esa unidad no llama a la API', async () => {
      const llamada = vi.spyOn(clienteApi, 'cancelarAveria');
      const { result } = montar();

      let capturado: unknown;
      await act(async () => {
        capturado = await result.current.cancelar('ej-1', 'M-03').catch((e: unknown) => e);
      });

      expect(llamada).not.toHaveBeenCalled();
      expect((capturado as Error).message).toMatch(/ya se aplicó/);
    });
  });

  it('useAverias fuera del proveedor lanza un error explícito', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAverias())).toThrow('useAverias requiere un ProveedorAverias');
  });
});
