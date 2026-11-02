// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeApi, clienteApi } from '../../services/clienteApi';
import * as clienteStomp from '../../services/clienteStomp';
import type { EjecucionApi } from '../../types/api';
import { ModuloSimulacion } from './ModuloSimulacion';

// La corrida abierta se refleja en ?ejecucion=<id>: con ese parámetro en la URL (enlace compartido o
// recarga), se busca por id y se abre directamente, sin pasar por la lista. El límite de esta prueba
// es la búsqueda por id: lo que CorridaSimulacion hace después (estado en vivo por REST/STOMP) no lo
// ejercita ningún test del proyecto, así que no se llega hasta ahí.

const ejecucion: EjecucionApi = {
  id: 'sim-1',
  nombre: 'Simulación 5 días',
  tipoEscenario: 'SIMULACION_PERIODO',
  estado: 'EN_CURSO',
  algoritmo: 'GA',
  fechaInicio: '2026-03-03',
  horaInicio: '00:00:00',
  dias: 5,
  relojSimulado: null,
  relojReal: null,
  parametros: { saltoConsumoScSegundos: 1, saltoAlgoritmoSaMinutos: 30, factorAceleracionK: 180, fraccionSemaforoRojo: 0.15, fraccionSemaforoAmbar: 0.4 },
  indicadores: null,
  flota: { autos: 10, motos: 15, bicicletas: 12 },
};

beforeEach(() => {
  // ConfiguracionEscenario (lo que se ve sin ?ejecucion en la URL) pide la lista al montarse.
  vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([]);
  // Si una prueba llega a abrir una corrida, CorridaSimulacion pide su estado en vivo por REST y STOMP:
  // sin mock, intentaría una conexión de red real. Se deja pendiente para siempre (no es lo que se prueba
  // aquí) y sin tópicos reales.
  vi.spyOn(clienteApi, 'estado').mockReturnValue(new Promise(() => {}));
  vi.spyOn(clienteStomp, 'suscribir').mockReturnValue(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('ModuloSimulacion · abrir por URL', () => {
  it('sin ?ejecucion en la URL, muestra la configuración de escenario', async () => {
    render(<ModuloSimulacion />);
    expect(await screen.findByText('Configuración de escenario')).toBeTruthy();
  });

  it('con ?ejecucion=<id> en la URL, busca esa corrida y, mientras llega, lo dice', () => {
    window.history.replaceState(null, '', '/?tab=simulacion&ejecucion=sim-1');
    vi.spyOn(clienteApi, 'consultarEjecucion').mockReturnValue(new Promise(() => {})); // nunca resuelve
    render(<ModuloSimulacion />);
    expect(screen.getByText('Abrir simulación')).toBeTruthy();
    expect(screen.getByText('Abriendo…')).toBeTruthy();
  });

  it('con ?ejecucion=<id>, busca esa corrida por su id exacto', () => {
    window.history.replaceState(null, '', '/?tab=simulacion&ejecucion=sim-1');
    const consultar = vi.spyOn(clienteApi, 'consultarEjecucion').mockReturnValue(new Promise(() => {}));
    render(<ModuloSimulacion />);
    expect(consultar).toHaveBeenCalledWith('sim-1');
  });

  it('cuando la corrida pedida por URL no existe, se informa el error y se puede volver a la lista', async () => {
    window.history.replaceState(null, '', '/?tab=simulacion&ejecucion=no-existe');
    vi.spyOn(clienteApi, 'consultarEjecucion').mockRejectedValue(new ErrorDeApi(404, 'No se encontró la ejecución no-existe'));
    render(<ModuloSimulacion />);

    expect(await screen.findByText('No se encontró la ejecución no-existe')).toBeTruthy();
    expect(screen.queryByText('Abriendo…')).toBeNull();

    screen.getByRole('button', { name: 'Ver otras simulaciones' }).click();
    expect(await screen.findByText('Configuración de escenario')).toBeTruthy();
    // Solo se quita "ejecucion" de la URL: "tab" se queda, porque se sigue viendo Simulación.
    expect(window.location.search).toBe('?tab=simulacion');
  });

  it('al abrir una corrida de la lista, su id queda en la URL sin volver a pedirla', async () => {
    vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([ejecucion]);
    const consultar = vi.spyOn(clienteApi, 'consultarEjecucion');
    render(<ModuloSimulacion />);

    fireEvent.click(await screen.findByRole('tab', { name: /Simulaciones existentes/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Ver corrida/ }));

    expect(window.location.search).toBe('?ejecucion=sim-1');
    // ConfiguracionEscenario entrega la ejecución completa: no hace falta volver a pedirla por id.
    expect(consultar).not.toHaveBeenCalled();
  });
});
