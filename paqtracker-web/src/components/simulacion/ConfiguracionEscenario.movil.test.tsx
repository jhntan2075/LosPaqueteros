// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteApi } from '../../services/clienteApi';
import { ModuloSimulacion } from './ModuloSimulacion';

const simularPantalla = (angosta: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((consulta: string) => ({
      matches: angosta,
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );

beforeEach(() => {
  vi.spyOn(clienteApi, 'listarEjecuciones').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Simulación en celular', () => {
  it('hay un solo botón "Ejecutar simulación" y está en la barra fija', async () => {
    simularPantalla(true);
    render(<ModuloSimulacion />);
    await screen.findByRole('heading', { name: 'Nueva simulación' });
    const botones = screen.getAllByRole('button', { name: /Ejecutar simulación/ });
    expect(botones).toHaveLength(1);
    expect(botones[0].closest('[data-barra-fija]')).not.toBeNull();
  });

  it('en pantalla ancha el botón queda en el resumen, fuera de la barra fija', async () => {
    simularPantalla(false);
    render(<ModuloSimulacion />);
    await screen.findByRole('heading', { name: 'Nueva simulación' });
    const botones = screen.getAllByRole('button', { name: /Ejecutar simulación/ });
    expect(botones).toHaveLength(1);
    expect(botones[0].closest('[data-barra-fija]')).toBeNull();
  });
});
